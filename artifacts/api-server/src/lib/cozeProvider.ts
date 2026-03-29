import { logger } from "./logger";
import type { PipelineResult } from "./aiPipeline";
import { extractVerifyFlags, extractDetectedStatutes, extractSuggestedCases } from "./aiPipeline";

const COZE_API_URL = "https://api.coze.com/open_api/v2/chat";

export function isCozeAvailable(): boolean {
  return !!(process.env.COZE_API_TOKEN && process.env.COZE_BOT_ID);
}

export async function callCoze(
  query: string,
  practiceArea: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<PipelineResult> {
  const token = process.env.COZE_API_TOKEN;
  const botId = process.env.COZE_BOT_ID;

  if (!token || !botId) {
    throw new Error("Coze provider is not configured. COZE_API_TOKEN and COZE_BOT_ID are required.");
  }

  const cozeMessages = conversationHistory.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    content_type: "text",
  }));

  const userMessage = `Practice Area: ${practiceArea}\n\n${query}`;

  const requestBody = {
    bot_id: botId,
    user: "lex-superior-user",
    query: userMessage,
    chat_history: cozeMessages,
    stream: false,
  };

  logger.info({ botId }, "Calling Coze API");

  const response = await fetch(COZE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Coze API returned ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    code: number;
    msg: string;
    messages?: Array<{
      role: string;
      type: string;
      content: string;
      content_type: string;
    }>;
  };

  if (data.code !== 0) {
    throw new Error(`Coze API error (code ${data.code}): ${data.msg}`);
  }

  const answerMessage = data.messages?.find(
    m => m.role === "assistant" && m.type === "answer"
  );

  const content = answerMessage?.content || "";

  if (!content) {
    throw new Error("Coze API returned an empty response.");
  }

  const flags = extractVerifyFlags(content);
  const detectedStatutes = extractDetectedStatutes(content);
  const suggestedCases = extractSuggestedCases(content);
  const applicableRules = detectedStatutes.filter(
    s => s.toLowerCase().includes("rule") || s.toLowerCase().includes("si")
  );

  return {
    content,
    thinkingChain: undefined,
    providerUsed: "Coze",
    flags,
    detectedStatutes,
    suggestedCases,
    applicableRules,
    fromCache: false,
  };
}
