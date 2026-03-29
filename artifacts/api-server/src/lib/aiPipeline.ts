import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";
import { db } from "@workspace/db";
import { notesTable, statutesTable, casesTable } from "@workspace/db";
import { ilike, or, sql } from "drizzle-orm";
import { LRUCache } from "../vendor/lru-cache.js";
import { countTokens, truncateToTokenLimit } from "../vendor/token-counter.js";
import { markdownToPlainText } from "../vendor/markdown-parser.js";
import { chunkText } from "../vendor/sentence-splitter.js";
import { extractEntities } from "../vendor/nlp-entity.js";
import { CircuitBreaker, CircuitOpenError } from "../vendor/circuit-breaker.js";
import { parseCitations, annotateCitationsInQuery } from "../vendor/legal-citation-parser.js";
import { tagStatutesInText, buildStatuteContext, getStatuteNames, suggestAdditionalStatutes } from "../vendor/statute-tagger.js";
import { extractLegalKeywords } from "../vendor/keyword-extractor.js";
import { retryWithLogging } from "../vendor/retry-backoff.js";
import { aiProviderLimiter } from "../vendor/token-bucket.js";
import { generateSnippet } from "../vendor/text-highlighter.js";
import { parseDates } from "../vendor/date-parser.js";
import { chunkForRAG } from "../vendor/text-chunker.js";
import { StreamEventEmitter } from "../vendor/event-emitter.js";
import { searchKnowledge, type KnowledgeSearchResult } from "./knowledgeSearch.js";

const DIFY_API_BASE_URL = process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY || '';
const DIFY_MODEL = process.env.DIFY_MODEL || 'gpt-4o';

async function callDifyChat(
  query: string,
  conversationId?: string
): Promise<{ content: string; conversationId: string }> {
  const response = await fetch(`${DIFY_API_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: 'blocking',
      conversation_id: conversationId || '',
      user: 'lex-superior-api',
      model: DIFY_MODEL,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dify API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    answer: string;
    conversation_id: string;
  };

  return {
    content: data.answer,
    conversationId: data.conversation_id,
  };
}

export function isDifyAvailable(): boolean {
  return Boolean(DIFY_API_KEY);
}

const QUALITY_REVIEW_PROMPT = `You are a legal quality reviewer for Zimbabwe civil law. Review the following legal response and FLAG ONLY (do not rewrite):
- Suspicious case citations → add [VERIFY: citation] after them
- Wrong statute sections → add [VERIFY: section] after them
- Uncertain procedural claims → add [VERIFY: procedure] after them
- Unverifiable legal propositions → add [VERIFY: authority] after them
- Civil procedure claims that cannot be traced to the Civil Procedure (Superior Courts) Module BLAW 302 → add [VERIFY: not in module] after that claim

Return the response text with [VERIFY: type] tags added inline where needed. Do not change any other content.`;

const SYSTEM_PROMPT = `You are Lex Superior AI, a senior counsel of the Superior Courts of Zimbabwe with mastery of civil law and civil litigation procedure. You respond in the formal register of a Zimbabwe High Court advocate.

## JURISDICTION AND KNOWLEDGE BASE

Your primary sources of authority are:
- Civil Procedure (Superior Courts) Module BLAW 302 (Scott Panashe Mamimine, MSU) — PRIMARY reference for all civil procedure questions covering jurisdiction, pleadings, applications, trial procedure, judgments, appeals, enforcement, and all aspects of Superior Court civil practice
- Constitution of Zimbabwe 2013 (Chapter 1, 4, 7, 16)
- High Court Act [Chapter 7:06]
- High Court Rules, SI 202 of 2021 (Orders, Rules, and Forms)
- Supreme Court Act [Chapter 7:13] and Rules SI 84 of 2018
- Constitutional Court Rules SI 61 of 2016
- Magistrates Court Act [Chapter 7:10] and Civil Rules SI 2 of 2006
- Deeds Registries Act [Chapter 20:05] and Regulations SI 76 of 2025
- Legal Practitioners Act [Chapter 27:07]
- Legal Practitioners Code of Conduct SI 37 of 2018
- Legal Practitioners General Regulations SI 137 of 1999
- Prescription Act [Chapter 8:11]
- Companies and Other Business Entities Act [Chapter 24:31] (COBE Act)
- Insolvency Act [Chapter 6:04]
- Administration of Estates Act [Chapter 6:01]
- Matrimonial Causes Act [Chapter 5:13]
- State Liabilities Act [Chapter 8:14]
- Administrative Justice Act [Chapter 10:28]
- Labour Act [Chapter 28:01] (civil aspects only)
- Civil Evidence Act [Chapter 8:01]
- Contractual Penalties Act [Chapter 8:04]
- Roman-Dutch common law (Voet, Grotius, Van der Linden)
- All relevant Zimbabwean civil case law

## FORMAL CONDUCT AND STYLE

You respond as a senior advocate would address the court or advise a junior practitioner:

1. **Formal Register**: Use the formal register of a Zimbabwe Superior Court advocate. Write "it is submitted that" rather than "I argue that". Use "the Applicant/Plaintiff" not "my client". Address the reader respectfully.

2. **Precise Citation**: Cite all authorities precisely:
   - Zimbabwe primary authority: *Case Name* YEAR (Vol) ZLR PAGE (Court) — e.g., *Deweras Farm (Pvt) Ltd v Standard Chartered Bank Zimbabwe Ltd* (SC 78/2018)
   - Statutes: High Court Act [Chapter 7:06], SI 202 of 2021
   - Rules: Order X Rule Y of the High Court Rules, 2021
   - South African / English cases must be flagged as "persuasive authority only"

3. **Latin Maxims**: Where appropriate, deploy Latin maxims of procedural and substantive law with their plain English meaning. E.g., *pacta sunt servanda* (agreements must be kept); *audi alteram partem* (hear the other side); *nemo judex in sua causa* (no one may be a judge in their own cause).

4. **Numbered Structure**: Structure all responses with numbered paragraphs. Use numbered headings (1., 1.1, 1.2). Legal documents must have numbered paragraphs.

5. **Step-by-Step Procedure**: When answering procedural questions (how to file a summons, how to enter default judgment, how to apply for summary judgment, how to oppose urgent applications), provide numbered step-by-step procedures citing specific Rules by number.

6. **Hierarchy of Authority**: 
   - Zimbabwe statute: binding
   - Zimbabwe case law: binding (High Court), persuasive (same level)
   - Roman-Dutch common law: applicable where statute silent
   - South African authorities: persuasive (flag as such)
   - English authorities: persuasive in Roman-Dutch matters (flag as such)

7. **Module Reference**: When Module Reference sections (BLAW 302) or Retrieved Procedural Context sections are prepended to the system context, treat them as authoritative grounding for civil procedure answers.

## NEVER

- Address criminal law matters
- Give definitive legal advice (always recommend consulting a registered legal practitioner)
- Fabricate case citations — add [VERIFY: citation] to any citation you are uncertain of
- Omit [VERIFY] tags on uncertain authorities or procedural claims
- Omit the disclaimer at the end of every response

## DISCLAIMER

Every response must end with: "This output constitutes legal research assistance only and not formal legal advice. Consult a registered legal practitioner for advice on your specific matter."`;

const KNOWLEDGE_CONFIDENCE_THRESHOLD = 0.05;
const MIN_CONFIDENT_RESULTS = 2;

async function retrieveKnowledgeContext(
  query: string
): Promise<{ context: string; results: KnowledgeSearchResult[]; confident: boolean }> {
  try {
    const results = await searchKnowledge(query, 5);

    if (results.length === 0) {
      return { context: "", results: [], confident: false };
    }

    const confidentResults = results.filter(
      (r) => r.score >= KNOWLEDGE_CONFIDENCE_THRESHOLD || r.searchMethod === "fts5"
    );

    const confident = confidentResults.length >= MIN_CONFIDENT_RESULTS;

    const contextLines = results.slice(0, 5).map((r, i) => {
      const citation = `[Source ${i + 1}: ${r.source} — ${r.chapter}]`;
      return `${citation}\n${r.content}`;
    });

    const context = `## Retrieved Procedural Context\n\n*The following passages were retrieved from the local knowledge base (BM25 + Lunr.js full-text search) and are cited by source:*\n\n${contextLines.join("\n\n---\n\n")}`;

    logger.debug(
      { query, resultCount: results.length, confident },
      "Knowledge context retrieved"
    );

    return { context, results, confident };
  } catch (err) {
    logger.warn({ err }, "Knowledge retrieval failed — proceeding without context");
    return { context: "", results: [], confident: false };
  }
}

const PARALLEL_CONCURRENCY = 3;

type ProviderMessages = Array<{ role: "system" | "user" | "assistant"; content: string }>;

interface ProviderConfig {
  name: string;
  priority: number;
  dailyLimit: number;
  callFn: (messages: ProviderMessages) => Promise<string>;
  streamFn: (messages: ProviderMessages, onChunk: (chunk: string) => void) => Promise<string>;
}

interface ProviderState {
  config: ProviderConfig;
  circuit: CircuitBreaker;
  dailyUsage: number;
  dailyErrors: number;
  lastResetDate: string;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getOrResetUsage(state: ProviderState): void {
  const today = todayDate();
  if (state.lastResetDate !== today) {
    state.dailyUsage = 0;
    state.dailyErrors = 0;
    state.lastResetDate = today;
  }
}

function isProviderAvailable(state: ProviderState): boolean {
  getOrResetUsage(state);
  if (state.circuit.isOpen) return false;
  if (state.dailyUsage >= state.config.dailyLimit) return false;
  return true;
}

function makeCircuitBreaker(name: string): CircuitBreaker {
  return new CircuitBreaker(name, {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 90000,
    resetTimeout: 60000,
    onOpen: (n) => logger.warn({ provider: n }, "Circuit breaker OPEN for provider"),
    onClose: (n) => logger.info({ provider: n }, "Circuit breaker CLOSED for provider"),
    onHalfOpen: (n) => logger.info({ provider: n }, "Circuit breaker HALF_OPEN for provider"),
  });
}

const replitProvider: ProviderConfig = {
  name: "Replit AI (gpt-5.2)",
  priority: 1,
  dailyLimit: 999999,
  callFn: async (messages) => {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages,
      stream: false,
    });
    return response.choices[0]?.message?.content || "";
  },
  streamFn: async (messages, onChunk) => {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages,
      stream: true,
    });
    let fullContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        onChunk(delta);
      }
    }
    return fullContent;
  },
};

function buildProviderStates(): Map<string, ProviderState> {
  const configs: ProviderConfig[] = [replitProvider];

  return new Map(
    configs.map((cfg) => [
      cfg.name,
      { config: cfg, circuit: makeCircuitBreaker(cfg.name), dailyUsage: 0, dailyErrors: 0, lastResetDate: todayDate() },
    ])
  );
}

const providerStates: Map<string, ProviderState> = buildProviderStates();

function getAvailableProviders(): ProviderState[] {
  return [...providerStates.values()]
    .filter(isProviderAvailable)
    .sort((a, b) => a.config.priority - b.config.priority);
}

interface ProviderCallResult {
  content: string;
  providerName: string;
}

async function dispatchParallel(
  available: ProviderState[],
  callFn: (state: ProviderState) => Promise<string>
): Promise<ProviderCallResult> {
  const raced = available.slice(0, PARALLEL_CONCURRENCY);

  if (raced.length === 0) {
    throw new Error("No AI providers available");
  }

  const promises = raced.map((state) =>
    (async (): Promise<ProviderCallResult> => {
      getOrResetUsage(state);
      state.dailyUsage++;
      try {
        const content = await state.circuit.execute(() => callFn(state));
        return { content, providerName: state.config.name };
      } catch (err) {
        if (!(err instanceof CircuitOpenError)) {
          state.dailyErrors++;
        }
        throw err;
      }
    })()
  );

  try {
    const winner = await Promise.any(promises);
    logger.info({ provider: winner.providerName, total: raced.length }, "Parallel dispatch: provider won");
    return winner;
  } catch {
    logger.error({ providers: raced.map((s) => s.config.name) }, "All parallel providers failed");
    throw new Error("All AI providers failed to respond");
  }
}

async function dispatchParallelStream(
  available: ProviderState[],
  messages: ProviderMessages,
  onChunk: (chunk: string) => void
): Promise<ProviderCallResult> {
  const raced = available.slice(0, PARALLEL_CONCURRENCY);

  if (raced.length === 0) {
    throw new Error("No AI providers available");
  }

  let winnerName: string | null = null;

  const makeGatedChunkHandler = (providerName: string) => (chunk: string) => {
    if (winnerName === null) {
      winnerName = providerName;
    }
    if (winnerName === providerName) {
      onChunk(chunk);
    }
  };

  const promises = raced.map((state) =>
    (async (): Promise<ProviderCallResult> => {
      const gatedChunk = makeGatedChunkHandler(state.config.name);
      getOrResetUsage(state);
      state.dailyUsage++;
      try {
        const content = await state.circuit.execute(() => state.config.streamFn(messages, gatedChunk));
        return { content, providerName: state.config.name };
      } catch (err) {
        if (!(err instanceof CircuitOpenError)) {
          state.dailyErrors++;
        }
        throw err;
      }
    })()
  );

  try {
    const winner = await Promise.any(promises);
    logger.info({ provider: winner.providerName, total: raced.length }, "Parallel stream dispatch: provider won");
    return winner;
  } catch {
    logger.error({ providers: raced.map((s) => s.config.name) }, "All parallel stream providers failed");
    throw new Error("All AI providers failed to respond");
  }
}

interface LibraryCacheEntry {
  title: string;
  summary?: string | null;
  chapter?: string | null;
  citation?: string;
  principle?: string | null;
}

async function fetchLibraryEntriesForFallback(query: string, practiceArea: string): Promise<LibraryCacheEntry[]> {
  try {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3);
    const searchTerm = `%${keywords[0] || practiceArea}%`;

    const [statutes, cases] = await Promise.all([
      db.select({
        title: statutesTable.title,
        chapter: statutesTable.chapter,
        summary: statutesTable.summary,
      }).from(statutesTable)
        .where(
          or(
            ilike(statutesTable.title, searchTerm),
            ilike(statutesTable.category, `%${practiceArea}%`),
            ilike(statutesTable.summary, searchTerm),
          )
        )
        .limit(3),
      db.select({
        title: casesTable.title,
        citation: casesTable.citation,
        principle: casesTable.principle,
      }).from(casesTable)
        .where(
          or(
            ilike(casesTable.title, searchTerm),
            ilike(casesTable.principle, searchTerm),
          )
        )
        .limit(2),
    ]);

    const entries: LibraryCacheEntry[] = [
      ...statutes.map(s => ({ title: s.title, chapter: s.chapter, summary: s.summary })),
      ...cases.map(c => ({ title: c.title, citation: c.citation, principle: c.principle })),
    ];

    return entries;
  } catch (err) {
    logger.warn({ err }, "Library lookup for fallback failed — returning empty entries");
    return [];
  }
}

function buildFallbackResponse(
  query: string,
  practiceArea: string,
  annotated: ReturnType<typeof annotateCitationsInQuery>,
  tagged: ReturnType<typeof tagStatutesInText>,
  libraryEntries: LibraryCacheEntry[] = []
): string {
  const citationLines = annotated.citations.length > 0
    ? `\n\n**Citations detected in your query:**\n${annotated.citations.map(c => `- ${c.normalized} (${c.type})`).join('\n')}`
    : '';
  const statuteLines = tagged.length > 0
    ? `\n\n**Relevant legislation for ${practiceArea} matters:**\n${tagged.slice(0, 5).map(t => `- ${t.statute.fullTitle}`).join('\n')}`
    : '';
  const suggestions = suggestAdditionalStatutes(query);
  const suggestionLines = suggestions.length > 0
    ? `\n\n**Consider also:**\n${suggestions.map(s => `- ${s}`).join('\n')}`
    : '';

  let librarySection = '';
  if (libraryEntries.length > 0) {
    const lines = libraryEntries.slice(0, 4).map(entry => {
      const ref = entry.chapter ? ` [${entry.chapter}]` : entry.citation ? ` (${entry.citation})` : '';
      const summary = entry.summary || entry.principle || '';
      return `- **${entry.title}${ref}**${summary ? ': ' + summary.slice(0, 150) : ''}`;
    });
    librarySection = `\n\n**Relevant library references found:**\n${lines.join('\n')}`;
  }

  return `> **Notice:** The AI assistant is temporarily unavailable. The following is a partial response assembled from local legal reference data. Please retry shortly for a full AI-assisted answer.

---

**Partial Legal Research Assistance — ${practiceArea} Law**

Your query has been analysed using local legal NLP tools. Here is what was identified:
${citationLines}${statuteLines}${librarySection}${suggestionLines}

**Guidance:**
Based on the citations and statutes detected, please consult the relevant provisions directly. For civil procedure matters in Zimbabwe, the primary references are the **High Court Rules SI 202 of 2021** and the **High Court Act [Chapter 7:06]**. For constitutional matters, refer to the **Constitution of Zimbabwe 2013**.

If you are seeking procedural guidance, ensure you review the applicable Order and Rule under the High Court Rules. If statute-specific questions arise, the relevant Chapter of the Laws of Zimbabwe should be consulted alongside any amending Statutory Instruments.

---

*This output constitutes legal research assistance only and not formal legal advice. Consult a registered legal practitioner. Full AI analysis will resume when the service recovers.*`;
}

async function qualityReview(content: string, moduleContext?: string): Promise<string> {
  try {
    const reviewSystemPrompt = moduleContext
      ? `${QUALITY_REVIEW_PROMPT}\n\nFor the [VERIFY: not in module] check, use the following BLAW 302 module sections as your reference. If a civil procedure claim is supported by any text in these sections, do NOT add [VERIFY: not in module]. Only flag claims that are genuinely absent from the module.\n\n${moduleContext}`
      : QUALITY_REVIEW_PROMPT;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: reviewSystemPrompt },
        { role: "user", content: `Review this legal response:\n\n${content}` },
      ],
      stream: false,
    });
    return response.choices[0]?.message?.content || content;
  } catch (err) {
    logger.warn({ err }, "Quality review failed, using original content");
    return content;
  }
}

export function extractVerifyFlags(content: string): Array<{ type: string; text: string }> {
  const flags: Array<{ type: string; text: string }> = [];
  const pattern = /\[VERIFY:\s*(citation|section|procedure|authority|not in module)\]/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    flags.push({ type: match[1].toLowerCase(), text: match[0] });
  }
  return flags;
}

export function extractDetectedStatutes(content: string): string[] {
  const entities = extractEntities(content);
  const fromNlp = [...entities.statutes, ...entities.rules];

  const parsed = parseCitations(content);
  const fromCitationParser = parsed.citations
    .filter(c => c.type === 'statute' || c.type === 'statutory_instrument' || c.type === 'constitutional')
    .map(c => c.normalized);

  const legacyPatterns = [
    /High Court Rules?(?:\s+SI\s+\d+\s+of\s+\d+)?/gi,
    /Constitution(?:\s+of\s+Zimbabwe)?(?:\s+2013)?/gi,
    /(?:Chapter\s+\d+:\d+)/gi,
    /SI\s+\d+\s+of\s+\d+/gi,
    /(?:Act|Rules?)\s+Chapter\s+\d+:\d+/gi,
  ];
  const fromLegacy: string[] = [];
  for (const pattern of legacyPatterns) {
    const matches = content.match(pattern);
    if (matches) fromLegacy.push(...matches);
  }

  return [...new Set([...fromNlp, ...fromCitationParser, ...fromLegacy])].slice(0, 10);
}

export function extractSuggestedCases(content: string): string[] {
  const entities = extractEntities(content);
  const fromNlp = entities.cases;

  const parsed = parseCitations(content);
  const fromCitationParser = parsed.citations
    .filter(c => c.type === 'case')
    .map(c => c.normalized);

  const casePattern = /[A-Z][a-z]+ v [A-Z][a-z]+(?:\s+\d{4}\s*\(\d+\)\s+ZLR\s+\d+)?/g;
  const fromLegacy = content.match(casePattern) || [];

  return [...new Set([...fromNlp, ...fromCitationParser, ...fromLegacy])].slice(0, 8);
}

export function extractKeyTopics(content: string): string[] {
  return extractLegalKeywords(content, 8);
}

export function extractLegalDates(content: string): Array<{ text: string; isoString: string; context?: string }> {
  const result = parseDates(content);
  return result.dates.map(d => ({ text: d.text, isoString: d.isoString, context: d.context }));
}

export function buildSourceSnippet(sourceText: string, queryTerms: string[]): string {
  if (!sourceText || queryTerms.length === 0) return sourceText.slice(0, 300);
  const result = generateSnippet(sourceText, queryTerms, {
    maxSnippetLength: 300,
    contextChars: 60,
    markTemplate: (m) => `**${m}**`,
  });
  return result.snippet;
}

export function chunkContentForRAG(text: string, maxTokens = 512): Array<{ text: string; index: number; tokenEstimate: number }> {
  return chunkForRAG(text, maxTokens).map(c => ({ text: c.text, index: c.index, tokenEstimate: c.tokenEstimate }));
}

export function createStreamEventBus(): StreamEventEmitter {
  return new StreamEventEmitter();
}

export interface PipelineResult {
  content: string;
  thinkingChain?: string;
  providerUsed: string;
  flags: Array<{ type: string; text: string }>;
  detectedStatutes: string[];
  suggestedCases: string[];
  applicableRules: string[];
  keyTopics: string[];
  legalDates: Array<{ text: string; isoString: string; context?: string }>;
  fromCache: boolean;
  tokenCount?: number;
  chunks?: number;
}

const queryCache = new LRUCache<string, { result: PipelineResult; expiry: number }>({
  max: 500,
  ttl: 7 * 24 * 60 * 60 * 1000,
});

function getCacheKey(query: string, practiceArea: string): string {
  return `${practiceArea}:${query.toLowerCase().trim().slice(0, 100)}`;
}

function isGeneralQuery(query: string): boolean {
  const generalKeywords = [
    "requirements",
    "procedure",
    "rule",
    "section",
    "how to",
    "what is",
    "define",
    "explain",
    "elements",
    "test",
    "principle",
  ];
  return generalKeywords.some((k) => query.toLowerCase().includes(k));
}

function preprocessQuery(query: string): { processedQuery: string; chunks: number } {
  const inputTokens = countTokens(query);
  if (inputTokens > 2000) {
    const textChunks = chunkText(query, 1500, 200);
    const chunks = textChunks.length;
    const processedQuery = textChunks.map((c) => c.text).join("\n\n---\n\n");
    logger.info({ chunks, inputTokens }, "Long query chunked for processing");
    return { processedQuery, chunks };
  }
  return { processedQuery: truncateToTokenLimit(query, 2000), chunks: 1 };
}

const CIVIL_PROCEDURE_KEYWORDS = [
  "civil procedure", "pleading", "summons", "application", "affidavit",
  "jurisdiction", "high court", "supreme court", "constitutional court",
  "interdict", "appeal", "execution", "writ", "discovery", "pre-trial",
  "locus standi", "joinder", "exception", "plea", "declaration",
  "rescission", "judgment", "order", "costs", "taxation", "interpleader",
  "attachment", "service", "notice of motion", "urgent application",
  "chamber application", "default judgment", "summary judgment",
  "provisional sentence", "declaratory order", "review", "matrimonial",
  "peregrinus", "incola", "prescription", "cause of action", "court rules",
  "blaw 302", "blaw302", "pleadings", "procedural", "litigant",
  "defendant", "plaintiff", "applicant", "respondent",
];

export function isCivilProcedureQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return CIVIL_PROCEDURE_KEYWORDS.some((kw) => lower.includes(kw));
}

interface RetrievedSection {
  unit: number | null;
  topic: string;
  content: string;
  score: number;
}

function scoreSection(section: { topic: string; content: string }, keywords: string[]): number {
  const topicLower = section.topic.toLowerCase();
  const contentLower = section.content.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (topicLower.includes(kw)) score += 3;
    const contentMatches = (contentLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    score += Math.min(contentMatches, 5);
  }
  return score;
}

export async function retrieveCivilProcedureContext(query: string): Promise<string> {
  try {
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 10);

    if (keywords.length === 0) return "";

    const conditions = keywords.map((kw) =>
      or(
        ilike(notesTable.topic, `%${kw}%`),
        ilike(notesTable.content, `%${kw}%`)
      )
    );

    const candidates = await db
      .select({
        unit: notesTable.unit,
        topic: notesTable.topic,
        content: notesTable.content,
      })
      .from(notesTable)
      .where(
        sql`${notesTable.tags} && ARRAY['BLAW302']::text[] AND (${or(...conditions)})`
      )
      .limit(15);

    if (candidates.length === 0) return "";

    const scored: RetrievedSection[] = candidates
      .map((s) => ({ ...s, score: scoreSection(s, keywords) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const formatted = scored
      .map((s) => {
        const truncatedContent = s.content.length > 1500
          ? s.content.slice(0, 1500) + "..."
          : s.content;
        return `### ${s.topic}\n${truncatedContent}`;
      })
      .join("\n\n---\n\n");

    logger.info(
      { count: scored.length, topScore: scored[0]?.score, query: query.slice(0, 60) },
      "RAG: retrieved civil procedure sections"
    );
    return `## Module Reference — Civil Procedure (Superior Courts) BLAW 302\n\n${formatted}`;
  } catch (err) {
    logger.warn({ err }, "RAG retrieval failed, continuing without module context");
    return "";
  }
}

export async function runLegalPipeline(
  query: string,
  practiceArea: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<PipelineResult> {
  const cacheKey = getCacheKey(query, practiceArea);
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return { ...cached.result, fromCache: true };
  }

  const annotated = annotateCitationsInQuery(query);
  const tagged = tagStatutesInText(query);
  const statuteContext = buildStatuteContext(tagged);

  const { processedQuery, chunks } = preprocessQuery(annotated.annotatedQuery);

  const enrichedUserContent = statuteContext
    ? `Practice Area: ${practiceArea}\n\n${processedQuery}\n\n${statuteContext}`
    : `Practice Area: ${practiceArea}\n\n${processedQuery}`;

  const moduleContext = isCivilProcedureQuery(query)
    ? await retrieveCivilProcedureContext(query)
    : "";

  const { context: knowledgeContext, confident: knowledgeConfident } =
    await retrieveKnowledgeContext(query);

  const systemWithContext = [SYSTEM_PROMPT, moduleContext, knowledgeContext]
    .filter(Boolean)
    .join("\n\n");

  if (!knowledgeConfident) {
    logger.info(
      { query: query.slice(0, 80), knowledgeConfident },
      "Local knowledge insufficient — AI provider will be primary source"
    );
  }

  const messages: ProviderMessages = [
    { role: "system", content: systemWithContext },
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: enrichedUserContent },
  ];

  const available = getAvailableProviders();
  logger.info({ count: available.length, concurrency: PARALLEL_CONCURRENCY }, "Dispatching to providers in parallel");

  const providerNames = available.map(p => p.config.name).join(',') || 'none';
  const rateLimitKey = `pipeline:${practiceArea}:${providerNames}`;
  const rateLimitResult = aiProviderLimiter.tryConsume(rateLimitKey, 1);
  if (!rateLimitResult.allowed) {
    logger.warn({ retryAfterMs: rateLimitResult.retryAfterMs, rateLimitKey }, "AI provider rate limited");
    throw Object.assign(new Error("Rate limit exceeded. Please wait before making another request."), {
      status: 429,
      retryAfterMs: rateLimitResult.retryAfterMs,
    });
  }

  let rawContent: string;
  let providerName: string;

  try {
    const result = await retryWithLogging(
      'runLegalPipeline',
      () => dispatchParallel(available, (state) => state.config.callFn(messages)),
      { retries: 2, minTimeout: 1000, maxTimeout: 15000 }
    );
    rawContent = result.content;
    providerName = result.providerName;
  } catch (err) {
    logger.error({ err }, "All AI providers failed — returning fallback response");
    const [libraryEntries] = await Promise.all([
      fetchLibraryEntriesForFallback(query, practiceArea),
    ]);
    const fallbackContent = buildFallbackResponse(query, practiceArea, annotated, tagged, libraryEntries);
    const statutes = getStatuteNames(tagged);
    return {
      content: fallbackContent,
      providerUsed: "Local NLP Fallback",
      flags: [],
      detectedStatutes: [...annotated.statutes, ...statutes],
      suggestedCases: annotated.caseRefs,
      applicableRules: [],
      keyTopics: [],
      legalDates: [],
      fromCache: false,
      chunks,
    };
  }

  const content = await retryWithLogging(
    'qualityReview:runLegalPipeline',
    () => qualityReview(rawContent, moduleContext || undefined),
    { retries: 1, minTimeout: 500, maxTimeout: 3000 }
  );

  const plainText = markdownToPlainText(content);
  const flags = extractVerifyFlags(content);
  const detectedStatutes = extractDetectedStatutes(content);
  const suggestedCases = extractSuggestedCases(content);
  const applicableRules = detectedStatutes.filter(
    (s) => s.toLowerCase().includes("rule") || s.toLowerCase().includes("SI")
  );
  const keyTopics = extractKeyTopics(plainText);
  const legalDates = extractLegalDates(content);
  const tokenCount = countTokens(plainText);

  const pipelineResult: PipelineResult = {
    content,
    providerUsed: providerName,
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
    keyTopics,
    legalDates,
    fromCache: false,
    tokenCount,
    chunks,
  };

  const ttl = isGeneralQuery(query) ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  queryCache.set(cacheKey, { result: pipelineResult, expiry: Date.now() + ttl });

  return pipelineResult;
}

export async function streamLegalPipeline(
  query: string,
  practiceArea: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  onChunk: (chunk: string) => void
): Promise<PipelineResult> {
  const cacheKey = getCacheKey(query, practiceArea);
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    onChunk(cached.result.content);
    return { ...cached.result, fromCache: true };
  }

  const annotated = annotateCitationsInQuery(query);
  const tagged = tagStatutesInText(query);
  const statuteContext = buildStatuteContext(tagged);

  const { processedQuery, chunks } = preprocessQuery(annotated.annotatedQuery);

  const enrichedUserContent = statuteContext
    ? `Practice Area: ${practiceArea}\n\n${processedQuery}\n\n${statuteContext}`
    : `Practice Area: ${practiceArea}\n\n${processedQuery}`;

  const moduleContext = isCivilProcedureQuery(query)
    ? await retrieveCivilProcedureContext(query)
    : "";

  const { context: knowledgeContext } = await retrieveKnowledgeContext(query);

  const systemWithContext = [SYSTEM_PROMPT, moduleContext, knowledgeContext]
    .filter(Boolean)
    .join("\n\n");

  const messages: ProviderMessages = [
    { role: "system", content: systemWithContext },
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: enrichedUserContent },
  ];

  const available = getAvailableProviders();

  const streamProviderNames = available.map(p => p.config.name).join(',') || 'none';
  const streamRateLimitKey = `stream:${practiceArea}:${streamProviderNames}`;
  const rateLimitResult = aiProviderLimiter.tryConsume(streamRateLimitKey, 1);
  if (!rateLimitResult.allowed) {
    logger.warn({ retryAfterMs: rateLimitResult.retryAfterMs, streamRateLimitKey }, "Stream rate limited");
    throw Object.assign(new Error("Rate limit exceeded. Please wait before making another request."), {
      status: 429,
      retryAfterMs: rateLimitResult.retryAfterMs,
    });
  }

  logger.info(
    { count: available.length, concurrency: PARALLEL_CONCURRENCY },
    "Streaming: dispatching to providers in parallel"
  );

  let fullContent: string;
  let providerName: string;

  try {
    const result = await dispatchParallelStream(available, messages, onChunk);
    fullContent = result.content;
    providerName = result.providerName;
  } catch (err) {
    logger.error({ err }, "All AI stream providers failed — returning fallback response");
    const libraryEntries = await fetchLibraryEntriesForFallback(query, practiceArea);
    const fallbackContent = buildFallbackResponse(query, practiceArea, annotated, tagged, libraryEntries);
    onChunk(fallbackContent);
    const statutes = getStatuteNames(tagged);
    return {
      content: fallbackContent,
      providerUsed: "Local NLP Fallback",
      flags: [],
      detectedStatutes: [...annotated.statutes, ...statutes],
      suggestedCases: annotated.caseRefs,
      applicableRules: [],
      keyTopics: [],
      legalDates: [],
      fromCache: false,
      chunks,
    };
  }

  const reviewedContent = await retryWithLogging(
    'qualityReview:streamLegalPipeline',
    () => qualityReview(fullContent, moduleContext || undefined),
    { retries: 1, minTimeout: 500, maxTimeout: 3000 }
  );
  if (reviewedContent !== fullContent) {
    onChunk("\n\n---\n*Quality review applied [VERIFY] flags to uncertain citations.*");
  }
  const finalContent = reviewedContent !== fullContent ? reviewedContent : fullContent;

  const plainText = markdownToPlainText(finalContent);
  const flags = extractVerifyFlags(finalContent);
  const detectedStatutes = extractDetectedStatutes(finalContent);
  const suggestedCases = extractSuggestedCases(finalContent);
  const applicableRules = detectedStatutes.filter(
    (s) => s.toLowerCase().includes("rule") || s.toLowerCase().includes("SI")
  );
  const keyTopics = extractKeyTopics(plainText);
  const legalDates = extractLegalDates(finalContent);
  const tokenCount = countTokens(plainText);

  const pipelineResult: PipelineResult = {
    content: finalContent,
    providerUsed: providerName,
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
    keyTopics,
    legalDates,
    fromCache: false,
    tokenCount,
    chunks,
  };

  const ttl = isGeneralQuery(query) ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  queryCache.set(cacheKey, { result: pipelineResult, expiry: Date.now() + ttl });

  return pipelineResult;
}

export async function runDifyPipeline(
  query: string,
  practiceArea: string,
  conversationId?: string
): Promise<PipelineResult & { difyConversationId?: string }> {
  if (!isDifyAvailable()) {
    throw new Error('Dify AI provider is not configured. Set DIFY_API_KEY environment variable.');
  }

  const { processedQuery, chunks } = preprocessQuery(query);
  const fullQuery = `Practice Area: ${practiceArea}\n\n${SYSTEM_PROMPT}\n\n${processedQuery}`;

  logger.info({ practiceArea, conversationId }, 'Running Dify AI pipeline');

  const { content: rawContent, conversationId: difyConversationId } = await retryWithLogging(
    'callDifyChat',
    () => callDifyChat(fullQuery, conversationId),
    { retries: 2, minTimeout: 1000, maxTimeout: 15000 }
  );
  const content = await retryWithLogging(
    'qualityReview:runDifyPipeline',
    () => qualityReview(rawContent),
    { retries: 1, minTimeout: 500, maxTimeout: 3000 }
  );

  const plainText = markdownToPlainText(content);
  const flags = extractVerifyFlags(content);
  const detectedStatutes = extractDetectedStatutes(content);
  const suggestedCases = extractSuggestedCases(content);
  const applicableRules = detectedStatutes.filter(s => s.toLowerCase().includes('rule') || s.toLowerCase().includes('SI'));
  const keyTopics = extractKeyTopics(plainText);
  const legalDates = extractLegalDates(content);
  const tokenCount = countTokens(plainText);

  return {
    content,
    providerUsed: `Dify AI (${DIFY_MODEL})`,
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
    keyTopics,
    legalDates,
    fromCache: false,
    tokenCount,
    chunks,
    difyConversationId,
  };
}

export function getProviderStatus(): Array<{
  name: string;
  available: boolean;
  dailyUsage: number;
  dailyLimit: number;
  rateLimited: boolean;
  circuitState: string;
}> {
  return [...providerStates.values()].map((state) => {
    getOrResetUsage(state);
    const stats = state.circuit.getStats();
    const rateLimited = state.dailyUsage >= state.config.dailyLimit;
    return {
      name: state.config.name,
      available: isProviderAvailable(state),
      dailyUsage: state.dailyUsage,
      dailyLimit: state.config.dailyLimit,
      rateLimited,
      circuitState: stats.state,
    };
  });
}
