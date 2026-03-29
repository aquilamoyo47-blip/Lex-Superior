import { Router, type IRouter } from "express";
import { webhookAuth } from "../middleware/webhookAuth";
import { runLegalPipeline, runDifyPipeline, isDifyAvailable } from "../lib/aiPipeline";
import { db } from "@workspace/db";
import { statutesTable, casesTable, notesTable } from "@workspace/db";
import { ilike, or } from "drizzle-orm";
import { fuzzySearch } from "../vendor/fuzzy-search.js";
import { randomUUID } from "crypto";

const router: IRouter = Router();

type WebhookTask = 'chat' | 'document_generation' | 'library_search';

interface WebhookRequest {
  task: WebhookTask;
  payload: Record<string, unknown>;
  secret?: string;
  provider?: 'default' | 'dify';
}

interface WebhookResponse {
  success: boolean;
  requestId: string;
  task: WebhookTask;
  providerUsed: string;
  result: Record<string, unknown>;
  error?: string;
}

async function handleChat(payload: Record<string, unknown>, provider: string): Promise<Record<string, unknown>> {
  const message = payload.message as string;
  const practiceArea = (payload.practiceArea as string) || 'all';
  const conversationId = payload.conversationId as string | undefined;

  if (!message || typeof message !== 'string') {
    throw new Error('payload.message (string) is required for chat task');
  }

  if (provider === 'dify' && isDifyAvailable()) {
    const result = await runDifyPipeline(message, practiceArea, conversationId);
    return {
      content: result.content,
      providerUsed: result.providerUsed,
      flags: result.flags,
      detectedStatutes: result.detectedStatutes,
      suggestedCases: result.suggestedCases,
      applicableRules: result.applicableRules,
      fromCache: result.fromCache,
      tokenCount: result.tokenCount,
      difyConversationId: result.difyConversationId,
    };
  }

  const history = (payload.conversationHistory as Array<{ role: string; content: string }>) || [];
  const result = await runLegalPipeline(message, practiceArea, history);
  return {
    content: result.content,
    providerUsed: result.providerUsed,
    flags: result.flags,
    detectedStatutes: result.detectedStatutes,
    suggestedCases: result.suggestedCases,
    applicableRules: result.applicableRules,
    fromCache: result.fromCache,
    tokenCount: result.tokenCount,
  };
}

async function handleDocumentGeneration(payload: Record<string, unknown>, provider: string): Promise<Record<string, unknown>> {
  const documentType = payload.documentType as string;
  const caseDetails = (payload.caseDetails as Record<string, string>) || {};
  const additionalInfo = payload.additionalInfo as string | undefined;
  const practiceArea = (payload.practiceArea as string) || 'procedure';

  if (!documentType) {
    throw new Error('payload.documentType (string) is required for document_generation task');
  }

  const DOCUMENT_TEMPLATES: Record<string, string> = {
    "Court Application (Form 23)": `Draft a formal Court Application for the High Court of Zimbabwe in accordance with Rule 59 of the High Court Rules SI 202 of 2021 and Form 23.`,
    "Chamber Application (Form 25)": `Draft a Chamber Application for the High Court of Zimbabwe in accordance with Rule 60 of the High Court Rules SI 202 of 2021 and Form 25.`,
    "Urgent Chamber Application": `Draft an Urgent Chamber Application for the High Court of Zimbabwe including certificate of urgency.`,
    "Summons (Form 1)": `Draft a Summons for the High Court of Zimbabwe in accordance with Rule 12 of the High Court Rules SI 202 of 2021 and Form 1.`,
    "Declaration": `Draft a Declaration for the High Court of Zimbabwe in accordance with Rule 18 of the High Court Rules SI 202 of 2021.`,
    "Plea": `Draft a Plea for the High Court of Zimbabwe in accordance with Rule 19 of the High Court Rules SI 202 of 2021.`,
    "Founding Affidavit": `Draft a Founding Affidavit for use in High Court application proceedings in Zimbabwe.`,
    "Notice of Appeal to Supreme Court": `Draft a Notice of Appeal to the Supreme Court of Zimbabwe in accordance with Rule 5 of the Supreme Court Rules SI 84 of 2018.`,
    "Legal Opinion Letter": `Draft a formal Legal Opinion letter on the subject matter.`,
    "Demand Letter": `Draft a formal Demand Letter in accordance with Zimbabwe civil law practice.`,
  };

  const baseTemplate = DOCUMENT_TEMPLATES[documentType] || `Draft a ${documentType} for the High Court of Zimbabwe.`;

  const prompt = `${baseTemplate}

CASE DETAILS:
- Case Number: ${caseDetails.caseNumber || "HC ____/____"}
- Applicant/Plaintiff: ${caseDetails.applicant || "[APPLICANT]"}
- Respondent/Defendant: ${caseDetails.respondent || "[RESPONDENT]"}
- City/Location: ${caseDetails.city || "Harare"}
- Legal Practitioner: ${caseDetails.legalPractitioner || "[LEGAL PRACTITIONER]"}
- Law Firm: ${caseDetails.firm || "[FIRM NAME]"}
${additionalInfo ? `\nADDITIONAL INFORMATION:\n${additionalInfo}` : ""}

Generate the complete document with proper Zimbabwe High Court formatting.`;

  let result;
  if (provider === 'dify' && isDifyAvailable()) {
    result = await runDifyPipeline(prompt, practiceArea);
  } else {
    result = await runLegalPipeline(prompt, practiceArea);
  }

  return {
    id: randomUUID(),
    content: result.content,
    documentType,
    providerUsed: result.providerUsed,
    fromCache: result.fromCache,
  };
}

async function handleLibrarySearch(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const query = payload.query as string;
  const type = (payload.type as string) || 'all';
  const limit = Math.min(Number(payload.limit) || 20, 100);

  if (!query || typeof query !== 'string') {
    throw new Error('payload.query (string) is required for library_search task');
  }

  const results: Record<string, unknown> = {};

  if (type === 'all' || type === 'statutes') {
    const statutes = await db.select().from(statutesTable).limit(500);
    const found = fuzzySearch(statutes, query, { keys: ['title', 'summary', 'category'], threshold: 0.45, limit });
    results.statutes = found.map(r => r.item);
  }

  if (type === 'all' || type === 'cases') {
    const cases = await db.select().from(casesTable).limit(500);
    const found = fuzzySearch(cases, query, { keys: ['citation', 'title', 'principle', 'headnote'], threshold: 0.45, limit });
    results.cases = found.map(r => r.item);
  }

  if (type === 'all' || type === 'notes') {
    const notes = await db.select().from(notesTable).limit(500);
    const found = fuzzySearch(notes, query, { keys: ['topic', 'content'], threshold: 0.45, limit });
    results.notes = found.map(r => r.item);
  }

  return {
    query,
    type,
    ...results,
  };
}

router.post('/webhooks/n8n', webhookAuth, async (req, res) => {
  const requestId = randomUUID();
  const { task, payload = {}, provider = 'default' } = req.body as WebhookRequest;

  const validTasks: WebhookTask[] = ['chat', 'document_generation', 'library_search'];
  if (!task || !validTasks.includes(task)) {
    res.status(400).json({
      success: false,
      requestId,
      error: `Invalid or missing task. Must be one of: ${validTasks.join(', ')}`,
    });
    return;
  }

  try {
    let result: Record<string, unknown>;
    let providerUsed = 'Replit AI (gpt-5.2)';

    switch (task) {
      case 'chat': {
        result = await handleChat(payload, provider);
        providerUsed = (result.providerUsed as string) || providerUsed;
        break;
      }
      case 'document_generation': {
        result = await handleDocumentGeneration(payload, provider);
        providerUsed = (result.providerUsed as string) || providerUsed;
        break;
      }
      case 'library_search': {
        result = await handleLibrarySearch(payload);
        break;
      }
    }

    const response: WebhookResponse = {
      success: true,
      requestId,
      task,
      providerUsed,
      result,
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err, task, requestId }, 'n8n webhook error');
    res.status(500).json({
      success: false,
      requestId,
      task,
      providerUsed: 'none',
      result: {},
      error: (err as Error).message,
    });
  }
});

export default router;
