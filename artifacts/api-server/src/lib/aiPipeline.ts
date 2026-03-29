import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

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

async function qualityReview(content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      max_completion_tokens: 8192,
      messages: [
        { role: 'system', content: QUALITY_REVIEW_PROMPT },
        { role: 'user', content: `Review this legal response:\n\n${content}` }
      ],
      stream: false,
    });
    return response.choices[0]?.message?.content || content;
  } catch (err) {
    logger.warn({ err }, 'Quality review failed, using original content');
    return content;
  }
}

function extractVerifyFlags(content: string): Array<{ type: string; text: string }> {
  const flags: Array<{ type: string; text: string }> = [];
  const pattern = /\[VERIFY:\s*(citation|section|procedure|authority)\]/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    flags.push({ type: match[1].toLowerCase(), text: match[0] });
  }
  return flags;
}

function extractDetectedStatutes(content: string): string[] {
  const statutes: string[] = [];
  const patterns = [
    /High Court Rules?(?:\s+SI\s+\d+\s+of\s+\d+)?/gi,
    /Constitution(?:\s+of\s+Zimbabwe)?(?:\s+2013)?/gi,
    /(?:Chapter\s+\d+:\d+)/gi,
    /SI\s+\d+\s+of\s+\d+/gi,
    /(?:Act|Rules?)\s+Chapter\s+\d+:\d+/gi,
  ];
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) statutes.push(...matches);
  }
  return [...new Set(statutes)].slice(0, 10);
}

function extractSuggestedCases(content: string): string[] {
  const casePattern = /[A-Z][a-z]+ v [A-Z][a-z]+(?:\s+\d{4}\s*\(\d+\)\s+ZLR\s+\d+)?/g;
  const matches = content.match(casePattern) || [];
  return [...new Set(matches)].slice(0, 8);
}

export interface PipelineResult {
  content: string;
  providerUsed: string;
  flags: Array<{ type: string; text: string }>;
  detectedStatutes: string[];
  suggestedCases: string[];
  applicableRules: string[];
  fromCache: boolean;
}

const queryCache = new Map<string, { result: PipelineResult; expiry: number }>();

function getCacheKey(query: string, practiceArea: string): string {
  return `${practiceArea}:${query.toLowerCase().trim().slice(0, 100)}`;
}

function isGeneralQuery(query: string): boolean {
  const generalKeywords = ['requirements', 'procedure', 'rule', 'section', 'how to', 'what is', 'define', 'explain', 'elements', 'test', 'principle'];
  return generalKeywords.some(k => query.toLowerCase().includes(k));
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

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-6).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: 'user', content: `Practice Area: ${practiceArea}\n\n${query}` }
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 8192,
    messages,
    stream: false,
  });

  const rawContent = response.choices[0]?.message?.content || '';
  const content = await qualityReview(rawContent);

  const flags = extractVerifyFlags(content);
  const detectedStatutes = extractDetectedStatutes(content);
  const suggestedCases = extractSuggestedCases(content);
  const applicableRules = detectedStatutes.filter(s => s.toLowerCase().includes('rule') || s.toLowerCase().includes('SI'));

  const pipelineResult: PipelineResult = {
    content,
    providerUsed: 'Replit AI (gpt-5.2)',
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
    fromCache: false,
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

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-6).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: 'user', content: `Practice Area: ${practiceArea}\n\n${query}` }
  ];

  logger.info({ practiceArea }, 'Streaming legal pipeline with Replit AI (gpt-5.2)');

  const stream = await openai.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 8192,
    messages,
    stream: true,
  });

  let fullContent = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      onChunk(delta);
    }
  }

  const reviewedContent = await qualityReview(fullContent);
  if (reviewedContent !== fullContent) {
    onChunk('\n\n---\n*Quality review applied [VERIFY] flags to uncertain citations.*');
    fullContent = reviewedContent;
  }

  const flags = extractVerifyFlags(fullContent);
  const detectedStatutes = extractDetectedStatutes(fullContent);
  const suggestedCases = extractSuggestedCases(fullContent);
  const applicableRules = detectedStatutes.filter(s => s.toLowerCase().includes('rule') || s.toLowerCase().includes('SI'));

  const pipelineResult: PipelineResult = {
    content: fullContent,
    providerUsed: 'Replit AI (gpt-5.2)',
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
    fromCache: false,
  };

  const ttl = isGeneralQuery(query) ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  queryCache.set(cacheKey, { result: pipelineResult, expiry: Date.now() + ttl });

  return pipelineResult;
}

export function getProviderStatus(): Array<{
  name: string;
  available: boolean;
  dailyUsage: number;
  dailyLimit: number;
  rateLimited: boolean;
}> {
  return [{
    name: 'Replit AI (gpt-5.2)',
    available: true,
    dailyUsage: 0,
    dailyLimit: 999999,
    rateLimited: false,
  }];
}
