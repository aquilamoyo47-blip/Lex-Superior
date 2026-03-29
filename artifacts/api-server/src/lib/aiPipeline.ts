import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";
import { LRUCache } from "../vendor/lru-cache.js";
import { countTokens, truncateToTokenLimit } from "../vendor/token-counter.js";
import { markdownToPlainText } from "../vendor/markdown-parser.js";
import { chunkText } from "../vendor/sentence-splitter.js";
import { extractEntities } from "../vendor/nlp-entity.js";
import { CircuitBreaker, CircuitOpenError } from "../vendor/circuit-breaker.js";

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

Return the response text with [VERIFY: type] tags added inline where needed. Do not change any other content.`;

const SYSTEM_PROMPT = `You are Lex Superior AI, an expert legal advocate of the Superior Courts of Zimbabwe specialising exclusively in civil law and civil litigation.

Your knowledge base includes:
- Constitution of Zimbabwe 2013 (civil provisions)
- High Court Act Chapter 7:06
- High Court Rules SI 202 of 2021
- Supreme Court Act and Rules SI 84 of 2018
- Constitutional Court Rules SI 61 of 2016
- Deeds Registries Act Chapter 20:05
- SI 76 of 2025 Deeds Registries Regulations
- Legal Practitioners Act Chapter 27:07
- Legal Practitioners Code of Conduct SI 37 of 2018
- Legal Practitioners General Regulations SI 137 of 1999
- Prescription Act Chapter 8:11
- Companies and Other Business Entities Act Chapter 24:31
- Insolvency Act Chapter 6:04
- Administration of Estates Act Chapter 6:01
- Matrimonial Causes Act Chapter 5:13
- State Liabilities Act Chapter 8:14
- Administrative Justice Act Chapter 10:28
- Labour Act Chapter 28:01 (civil aspects only)
- Civil Evidence Act Chapter 8:01
- Contractual Penalties Act Chapter 8:04
- Civil Procedure notes (BLAW 302, MSU)
- All relevant Zimbabwean civil case law

CONDUCT:
- Precise, professional, authoritative legal tone
- Cite Zimbabwean statutes and rules accurately
- Cite Zimbabwean case law first
- Flag South African/English authorities as persuasive only
- Structure outputs with clear numbered headings
- Number all paragraphs in legal documents
- Always end: "This output constitutes legal research assistance only and not formal legal advice. Consult a registered legal practitioner."

NEVER:
- Address criminal law matters
- Give definitive legal advice
- Fabricate case citations
- Omit [VERIFY] tags on uncertain authorities`;

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

function buildCozeProvider(): ProviderConfig | null {
  const token = process.env.COZE_API_TOKEN;
  const botId = process.env.COZE_BOT_ID;
  if (!token || !botId) return null;

  const COZE_API_URL = "https://api.coze.com/open_api/v2/chat";

  async function callCozeRaw(messages: ProviderMessages): Promise<string> {
    const cozeHistory = messages
      .filter((m) => m.role !== "system")
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        content_type: "text",
      }));

    const lastUser = messages.filter((m) => m.role === "user").at(-1);
    const query = lastUser?.content || "";

    const response = await fetch(COZE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bot_id: botId, user: "lex-superior-user", query, chat_history: cozeHistory, stream: false }),
      signal: AbortSignal.timeout(90000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Coze API returned ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      code: number;
      msg: string;
      messages?: Array<{ role: string; type: string; content: string; content_type: string }>;
    };

    if (data.code !== 0) {
      throw new Error(`Coze API error (code ${data.code}): ${data.msg}`);
    }

    const answer = data.messages?.find((m) => m.role === "assistant" && m.type === "answer");
    const content = answer?.content || "";
    if (!content) throw new Error("Coze API returned an empty response.");
    return content;
  }

  return {
    name: "Coze",
    priority: 2,
    dailyLimit: 99999,
    callFn: callCozeRaw,
    streamFn: async (messages, onChunk) => {
      const content = await callCozeRaw(messages);
      onChunk(content);
      return content;
    },
  };
}

function buildProviderStates(): Map<string, ProviderState> {
  const configs: ProviderConfig[] = [replitProvider];
  const coze = buildCozeProvider();
  if (coze) configs.push(coze);

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

async function qualityReview(content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: QUALITY_REVIEW_PROMPT },
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
  const pattern = /\[VERIFY:\s*(citation|section|procedure|authority)\]/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    flags.push({ type: match[1].toLowerCase(), text: match[0] });
  }
  return flags;
}

export function extractDetectedStatutes(content: string): string[] {
  const entities = extractEntities(content);
  const fromNlp = [...entities.statutes, ...entities.rules];

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

  return [...new Set([...fromNlp, ...fromLegacy])].slice(0, 10);
}

export function extractSuggestedCases(content: string): string[] {
  const entities = extractEntities(content);
  const fromNlp = entities.cases;

  const casePattern = /[A-Z][a-z]+ v [A-Z][a-z]+(?:\s+\d{4}\s*\(\d+\)\s+ZLR\s+\d+)?/g;
  const fromLegacy = content.match(casePattern) || [];

  return [...new Set([...fromNlp, ...fromLegacy])].slice(0, 8);
}

export interface PipelineResult {
  content: string;
  thinkingChain?: string;
  providerUsed: string;
  flags: Array<{ type: string; text: string }>;
  detectedStatutes: string[];
  suggestedCases: string[];
  applicableRules: string[];
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

  const { processedQuery, chunks } = preprocessQuery(query);

  const messages: ProviderMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: `Practice Area: ${practiceArea}\n\n${processedQuery}` },
  ];

  const available = getAvailableProviders();
  logger.info({ count: available.length, concurrency: PARALLEL_CONCURRENCY }, "Dispatching to providers in parallel");

  const { content: rawContent, providerName } = await dispatchParallel(available, (state) =>
    state.config.callFn(messages)
  );

  const content = await qualityReview(rawContent);

  const plainText = markdownToPlainText(content);
  const flags = extractVerifyFlags(content);
  const detectedStatutes = extractDetectedStatutes(content);
  const suggestedCases = extractSuggestedCases(content);
  const applicableRules = detectedStatutes.filter(
    (s) => s.toLowerCase().includes("rule") || s.toLowerCase().includes("SI")
  );
  const tokenCount = countTokens(plainText);

  const pipelineResult: PipelineResult = {
    content,
    providerUsed: providerName,
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
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

  const { processedQuery, chunks } = preprocessQuery(query);

  const messages: ProviderMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: `Practice Area: ${practiceArea}\n\n${processedQuery}` },
  ];

  const available = getAvailableProviders();
  logger.info(
    { count: available.length, concurrency: PARALLEL_CONCURRENCY },
    "Streaming: dispatching to providers in parallel"
  );

  const { content: fullContent, providerName } = await dispatchParallelStream(available, messages, onChunk);

  const reviewedContent = await qualityReview(fullContent);
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
  const tokenCount = countTokens(plainText);

  const pipelineResult: PipelineResult = {
    content: finalContent,
    providerUsed: providerName,
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
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

  const { content: rawContent, conversationId: difyConversationId } = await callDifyChat(fullQuery, conversationId);
  const content = await qualityReview(rawContent);

  const plainText = markdownToPlainText(content);
  const flags = extractVerifyFlags(content);
  const detectedStatutes = extractDetectedStatutes(content);
  const suggestedCases = extractSuggestedCases(content);
  const applicableRules = detectedStatutes.filter(s => s.toLowerCase().includes('rule') || s.toLowerCase().includes('SI'));
  const tokenCount = countTokens(plainText);

  return {
    content,
    providerUsed: `Dify AI (${DIFY_MODEL})`,
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
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
  const statuses = [...providerStates.values()].map((state) => {
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

  const cozeConfigured = !!(process.env.COZE_API_TOKEN && process.env.COZE_BOT_ID);
  if (!cozeConfigured && !statuses.find((s) => s.name === "Coze")) {
    statuses.push({
      name: "Coze",
      available: false,
      dailyUsage: 0,
      dailyLimit: 99999,
      rateLimited: false,
      circuitState: "N/A",
    });
  }

  if (!statuses.find((s) => s.name.startsWith("Dify"))) {
    statuses.push({
      name: `Dify AI (${DIFY_MODEL})`,
      available: isDifyAvailable(),
      dailyUsage: 0,
      dailyLimit: 999999,
      rateLimited: false,
      circuitState: isDifyAvailable() ? "CLOSED" : "N/A",
    });
  }

  return statuses;
}
