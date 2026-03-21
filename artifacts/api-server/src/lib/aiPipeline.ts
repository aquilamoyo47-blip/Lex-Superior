import { logger } from "./logger";

const SYSTEM_PROMPT = `You are Lex Superior, an expert legal advocate of the Superior Courts of Zimbabwe specialising exclusively in civil law and civil litigation.

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

const QUALITY_REVIEW_PROMPT = `You are a legal quality reviewer for Zimbabwe civil law. Review the following legal response and FLAG ONLY (do not rewrite):
- Suspicious case citations → add [VERIFY: citation] after them
- Wrong statute sections → add [VERIFY: section] after them
- Uncertain procedural claims → add [VERIFY: procedure] after them
- Unverifiable legal propositions → add [VERIFY: authority] after them

Return the response text with [VERIFY: type] tags added inline where needed. Do not change any other content.`;

interface ProviderConfig {
  name: string;
  endpoint: string;
  key: string | undefined;
  model: string;
  rpm: number;
  dailyLimit: number;
  priority: number;
}

const PROVIDER_POOL: ProviderConfig[] = [
  {
    name: 'sambanova',
    endpoint: 'https://api.sambanova.ai/v1/chat/completions',
    key: process.env.SAMBANOVA_API_KEY,
    model: 'DeepSeek-R1',
    rpm: 50,
    dailyLimit: 99999,
    priority: 1
  },
  {
    name: 'groq_1',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY_1,
    model: 'deepseek-r1-distill-llama-70b',
    rpm: 30,
    dailyLimit: 6000,
    priority: 2
  },
  {
    name: 'groq_2',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY_2,
    model: 'deepseek-r1-distill-llama-70b',
    rpm: 30,
    dailyLimit: 6000,
    priority: 3
  },
  {
    name: 'cerebras',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions',
    key: process.env.CEREBRAS_API_KEY,
    model: 'llama3.1-70b',
    rpm: 60,
    dailyLimit: 99999,
    priority: 4
  },
  {
    name: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY,
    model: 'deepseek/deepseek-r1:free',
    rpm: 10,
    dailyLimit: 200,
    priority: 5
  }
];

const rateLimitCache = new Map<string, number>();
const usageCache = new Map<string, number>();

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function isRateLimited(name: string): boolean {
  const expiry = rateLimitCache.get(name);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    rateLimitCache.delete(name);
    return false;
  }
  return true;
}

function markRateLimited(name: string, ttlSeconds: number): void {
  rateLimitCache.set(name, Date.now() + ttlSeconds * 1000);
}

function getUsage(name: string): number {
  return usageCache.get(`${name}:${today()}`) || 0;
}

function incrementUsage(name: string): void {
  const key = `${name}:${today()}`;
  usageCache.set(key, (usageCache.get(key) || 0) + 1);
}

function getAvailableProvider(): ProviderConfig | null {
  for (const provider of PROVIDER_POOL) {
    if (!provider.key) continue;
    if (isRateLimited(provider.name)) continue;
    if (getUsage(provider.name) >= provider.dailyLimit) continue;
    return provider;
  }
  return null;
}

interface CallResult {
  content: string;
  thinkingChain?: string;
  provider: string;
}

async function callProvider(
  provider: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  depth = 0
): Promise<CallResult> {
  if (depth > PROVIDER_POOL.length) {
    throw new Error('All providers exhausted');
  }

  try {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: 4096,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (response.status === 429) {
      markRateLimited(provider.name, 60);
      logger.warn({ provider: provider.name }, 'Provider rate limited, trying next');
      const next = getAvailableProvider();
      if (!next) throw new Error('All providers rate limited');
      return callProvider(next, messages, depth + 1);
    }

    if (!response.ok) {
      throw new Error(`Provider ${provider.name} returned ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: { content: string; reasoning_content?: string };
      }>;
    };

    incrementUsage(provider.name);

    const content = data.choices[0]?.message?.content || '';
    const thinkingChain = data.choices[0]?.message?.reasoning_content;

    return { content, thinkingChain, provider: provider.name };
  } catch (err) {
    markRateLimited(provider.name, 30);
    logger.warn({ provider: provider.name, err }, 'Provider call failed, trying next');
    const next = getAvailableProvider();
    if (!next) throw new Error('All providers exhausted');
    return callProvider(next, messages, depth + 1);
  }
}

async function qualityReview(content: string): Promise<string> {
  const reviewProvider = getAvailableProvider();
  if (!reviewProvider) return content;

  try {
    const result = await callProvider(reviewProvider, [
      { role: 'system', content: QUALITY_REVIEW_PROMPT },
      { role: 'user', content: `Review this legal response:\n\n${content}` }
    ]);
    return result.content || content;
  } catch {
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
  thinkingChain?: string;
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

  const provider = getAvailableProvider();
  if (!provider) {
    throw new Error('No AI providers available. Please try again later.');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-6),
    { role: 'user', content: `Practice Area: ${practiceArea}\n\n${query}` }
  ];

  const result = await callProvider(provider, messages);

  const reviewedContent = await qualityReview(result.content);

  const flags = extractVerifyFlags(reviewedContent);
  const detectedStatutes = extractDetectedStatutes(reviewedContent);
  const suggestedCases = extractSuggestedCases(reviewedContent);
  const applicableRules = detectedStatutes.filter(s => s.toLowerCase().includes('rule') || s.toLowerCase().includes('SI'));

  const pipelineResult: PipelineResult = {
    content: reviewedContent,
    thinkingChain: result.thinkingChain,
    providerUsed: result.provider,
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
  return PROVIDER_POOL.map(p => ({
    name: p.name,
    available: !!p.key && !isRateLimited(p.name) && getUsage(p.name) < p.dailyLimit,
    dailyUsage: getUsage(p.name),
    dailyLimit: p.dailyLimit,
    rateLimited: isRateLimited(p.name),
  }));
}
