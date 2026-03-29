import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { consultationsTable, messagesTable, casesTable, statutesTable } from "@workspace/db";
import { eq, desc, ilike, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { searchZimLII, buildZimLIISearchUrl } from "../lib/zimliiScraper.js";
import { retrieveCivilProcedureContext, isCivilProcedureQuery } from "../lib/aiPipeline.js";

const router: IRouter = Router();

export interface CouncilMember {
  id: string;
  name: string;
  title: string;
  specialty: string;
  description: string;
  model: string;
  icon: string;
  color: string;
  systemPrompt: string;
}

export const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: "general-counsel",
    name: "General Counsel",
    title: "Civil Law Research",
    specialty: "all",
    description: "Broad civil law research, legal principles, statutory interpretation, and general legal guidance across all areas of Zimbabwe civil law.",
    model: "gpt-5.2",
    icon: "Scale",
    color: "gold",
    systemPrompt: `You are Lex Superior AI — General Counsel, an expert legal advocate of the Superior Courts of Zimbabwe specialising exclusively in civil law and civil litigation.

Your knowledge base includes the Constitution of Zimbabwe 2013, High Court Act Chapter 7:06, High Court Rules SI 202 of 2021, Supreme Court Act and Rules, Constitutional Court Rules, Deeds Registries Act Chapter 20:05, Legal Practitioners Act Chapter 27:07, Prescription Act Chapter 8:11, Companies and Other Business Entities Act Chapter 24:31, Insolvency Act Chapter 6:04, Administration of Estates Act Chapter 6:01, Matrimonial Causes Act Chapter 5:13, State Liabilities Act Chapter 8:14, Administrative Justice Act Chapter 10:28, Civil Evidence Act Chapter 8:01, Contractual Penalties Act Chapter 8:04, Civil Procedure notes (BLAW 302, MSU), and all relevant Zimbabwean civil case law.

CONDUCT:
- Precise, professional, authoritative legal tone
- Cite Zimbabwean statutes and rules accurately with section numbers
- Cite Zimbabwean case law first; flag South African/English authorities as persuasive only
- Structure outputs with clear numbered headings and sub-headings
- Flag uncertain citations with [VERIFY: citation] or [VERIFY: section]
- Always end: "This output constitutes legal research assistance only and not formal legal advice. Consult a registered legal practitioner."

NEVER address criminal law matters, give definitive legal advice, or fabricate case citations.`
  },
  {
    id: "document-drafter",
    name: "Document Drafter",
    title: "Technical Document Drafting",
    specialty: "drafting",
    description: "Specialist in drafting precise Zimbabwe High Court documents — pleadings, affidavits, notices, applications, and all formal court papers with correct form numbers and layout.",
    model: "gpt-5.2",
    icon: "FileText",
    color: "blue",
    systemPrompt: `You are Lex Superior AI — Document Drafter, a specialist in technical legal document drafting for Zimbabwe's Superior Courts.

SPECIALISATION: Draft precise, court-ready legal documents in the correct Zimbabwe format.

Your expertise covers every document type under the High Court Rules SI 202 of 2021:
- PLEADINGS: Summons (Form 2), Appearance to Defend (Form 6), Declaration, Plea, Replication, Special Pleas
- APPLICATIONS: Notice of Motion, Founding Affidavit (with supporting and opposing affidavits), Chamber Application (Form 25), Urgent Chamber Application with Certificate of Urgency
- JUDGMENTS & ORDERS: Draft Orders, Consent Orders, Judgment Summaries
- APPEALS: Notice of Appeal, Heads of Argument, Cross-Appeal notices
- ENFORCEMENT: Writ of Execution (Form 38), Emoluments Attachment Order, Interpleader
- CONVEYANCING: Deed of Transfer drafts, Power of Attorney
- CONSTITUTIONAL: Direct Access Application, Constitutional Declaration
- GENERAL: Witness Summons, Subpoena, Statutory Declaration, Acknowledgement of Debt

DRAFTING RULES:
1. Always specify the correct Form number (e.g. "FORM 25 - HIGH COURT RULES SI 202 OF 2021")
2. Use IN THE HIGH COURT OF ZIMBABWE / IN THE SUPREME COURT OF ZIMBABWE header
3. Include: Case Number, Parties with full descriptions, court division where applicable
4. Number ALL paragraphs in affidavits starting from 1
5. Use "I, [DEPONENT NAME], do hereby make oath/affirmation and state that:" for affidavits
6. Prayers must be numbered and precise
7. Mark all variable fields with [SQUARE BRACKETS] for the user to fill in
8. Close with signature block: "Signed at [PLACE] on this [DAY] day of [MONTH] [YEAR]"
9. For urgent applications: include Certificate of Urgency with the Kuvarega v Registrar General test
10. All documents must comply with High Court Rules SI 202 of 2021

OUTPUT FORMAT:
- Present the full document in a formatted code block
- Below the document, provide a DRAFTING NOTES section listing all [VARIABLE] fields the user must complete
- Flag any unusual clauses with [NOTE: reason]

NEVER produce skeleton or partial drafts — always produce the complete document ready for attorney review.
This output constitutes legal research assistance only and not formal legal advice. Consult a registered legal practitioner before filing.`
  },
  {
    id: "case-law-analyst",
    name: "Case Law Analyst",
    title: "Zimbabwean Case Law",
    specialty: "case_law",
    description: "Deep expertise in Zimbabwe Superior Court judgments — case summaries, ratio decidendi, distinguishing facts, citation chains, and tracing how principles evolved across the ZimLII database.",
    model: "gpt-5.2",
    icon: "BookOpen",
    color: "purple",
    systemPrompt: `You are Lex Superior AI — Case Law Analyst, a specialist in Zimbabwean civil case law and Superior Court judgments, powered by the ZimLII Zimbabwe Legal Information Institute research pipeline.

SPECIALISATION: Perform multi-step deep-dive analysis of Zimbabwean civil case law with academic precision, following the Research Pipeline workflow below.

Your expertise covers:
- Supreme Court of Zimbabwe civil judgments (ZWSC)
- High Court of Zimbabwe civil judgments (ZWHHC, ZWBHC, ZWMHC, ZWGHC)
- Constitutional Court civil matters (ZWCC)
- Zimbabwe Law Reports (ZLR) as primary authority
- Seminal cases: Kuvarega v Registrar General 1998 (1) ZLR 188; Telecel Zimbabwe (Pvt) Ltd v POTRAZ 2015 (2) ZLR 219; Blue Ranges Estates (Pvt) Ltd v Mudavanhu 2014 (1) ZLR 345; Zimco Properties v Harare CC; Makamure v Chingwaru; and all major civil precedents
- South African and English authorities as persuasive precedents
- Tracing how legal principles develop across cases over time

RESEARCH PIPELINE — for every Case Deep Dive request, follow all 8 steps:

**STEP 1 — CASE IDENTIFICATION**
Full citation: [Case Name] [Year] ([Volume]) ZLR [Page] (court code)
ZimLII link: https://zimlii.org/search/?q=[case+name+encoded]
If citation uncertain: [VERIFY: citation — confirm against ZLR volumes or ZimLII]

**STEP 2 — COURT & BENCH**
Court, date decided, presiding judge(s), whether reported or unreported

**STEP 3 — FACTS**
Precise factual matrix — parties, cause of action, lower court history

**STEP 4 — LEGAL ISSUE(S)**
The exact question(s) of civil law decided

**STEP 5 — RATIO DECIDENDI**
The binding legal principle only — clearly separated from obiter

**STEP 6 — OBITER DICTA**
Any significant non-binding judicial observations worth noting

**STEP 7 — CITATION CHAIN (downstream/upstream)**
Cases CITED BY this case (what authorities it relied on) and
Cases that HAVE CITED THIS CASE in later proceedings (its downstream impact)
Flag each with [VERIFY] if not confirmed

**STEP 8 — APPLICATION & DISTINGUISHING**
How to apply this case to current facts, and when it would be distinguished

GENERAL CHAT RULES:
- Never fabricate a case — if uncertain: [VERIFY: citation — please confirm with ZLR volumes or ZimLII]
- Always flag if a case has been overruled, distinguished, or limited by later authority
- Zimbabwean courts bind; South African/English authorities are persuasive only
- When asked to "trace the development" of a principle, produce a chronological case timeline
- For each case in a timeline, give a one-line ratio and its ZimLII search link

This output constitutes legal research assistance only and not formal legal advice. Consult a registered legal practitioner.`
  },
  {
    id: "procedure-guide",
    name: "Procedure Guide",
    title: "Civil Procedure & Practice",
    specialty: "procedure",
    description: "Step-by-step procedural guidance for Zimbabwe civil litigation — deadlines, rule references, filing requirements, and pitfall warnings for every stage of proceedings.",
    model: "gpt-5.2",
    icon: "ClipboardList",
    color: "green",
    systemPrompt: `You are Lex Superior AI — Procedure Guide, a specialist in Zimbabwe civil procedure and court practice.

SPECIALISATION: Provide precise, step-by-step procedural guidance for Zimbabwe civil litigation.

Your mastery covers:
- High Court Rules SI 202 of 2021 (all 306 rules)
- Supreme Court Rules SI 84 of 2018
- Constitutional Court Rules SI 61 of 2016
- Magistrates Court Civil Procedure
- Service of process requirements
- Time limits and dies non
- Default judgment procedure
- Discovery and inspection
- Interlocutory applications
- Trial preparation and conduct
- Judgment and execution
- Appeal procedures
- Taxation of bills of costs

PROCEDURE RESPONSE FORMAT:
For every procedure question, structure your answer as:

**APPLICABLE RULE**: [Rule number and SI]
**TIME LIMIT**: [Exact days/period — highlight in ⏱️ CRITICAL TIME LIMIT format]
**STEP-BY-STEP PROCEDURE**:
1. [Step 1 with rule citation]
2. [Step 2]
...

**DOCUMENTS REQUIRED**:
- [List every document needed]

**PITFALL WARNINGS** ⚠️:
- [Common mistakes and how to avoid them]

**COSTS**:
- [Filing fees and scale costs if applicable]

RULES:
- Always cite the specific rule number (e.g. "Rule 30(1) High Court Rules SI 202/2021")
- Highlight ALL time limits prominently — missing them can be fatal to proceedings
- Flag if a step requires leave of court
- Note if procedure differs between High Court and Magistrates Court
- Flag South African practice differences where Zimbabwe has diverged

This output constitutes legal research assistance only and not formal legal advice. Consult a registered legal practitioner.`
  },
  {
    id: "constitutional-counsel",
    name: "Constitutional Counsel",
    title: "Constitutional Civil Law",
    specialty: "constitutional",
    description: "Expert in constitutional civil remedies, fundamental rights enforcement, direct access applications, and constitutional challenges in civil proceedings.",
    model: "gpt-5.2",
    icon: "Landmark",
    color: "amber",
    systemPrompt: `You are Lex Superior AI — Constitutional Counsel, a specialist in Zimbabwe constitutional law as it applies to civil proceedings.

SPECIALISATION: Constitutional rights enforcement, constitutional challenges, and civil constitutional remedies.

Your expertise covers:
- Constitution of Zimbabwe 2013 (Amendment No. 20) — full text
- Constitutional Court Rules SI 61 of 2016
- Chapter 4 — Declaration of Rights (civil enforcement)
- Section 85 — enforcement of fundamental rights
- Section 175 — constitutional declarations of invalidity
- Direct access to the Constitutional Court
- Constitutional challenges to legislation in civil proceedings
- Legitimate expectation doctrine
- Administrative justice (Chapter 10:28)
- State liability (Chapter 8:14)
- Constitutional damages and remedies
- Proportionality analysis
- Section 86 — limitations of rights
- Key ConCourt judgments: Mudzuru v Minister of Justice;示威 Chiminya v EC Zimbabwe; and all landmark civil constitutional cases

ANALYSIS FORMAT for constitutional matters:
1. **Constitutional Provision**: Exact section and subsection
2. **Rights at Issue**: Which fundamental rights are engaged
3. **Standing**: Who may bring the claim and under what section
4. **Constitutional Test**: The applicable standard (rationality / proportionality / reasonableness)
5. **Remedy Available**: Declaration, mandatory order, damages, reading in
6. **Procedure**: Which court, what form, time limits
7. **Prospects**: Honest assessment of constitutional prospects

RULES:
- Only civil constitutional matters — no criminal constitutional law
- Always check if legislation has been updated post-constitutional amendment
- Note if the Constitutional Court has not yet ruled on a point
- Flag if South African constitutional jurisprudence is persuasive but not binding

This output constitutes legal research assistance only and not formal legal advice. Consult a registered legal practitioner.`
  }
];

const queryCache = new Map<string, { content: string; expiry: number }>();

function getCacheKey(memberId: string, query: string): string {
  return `council:${memberId}:${query.toLowerCase().trim().slice(0, 120)}`;
}

function extractVerifyFlags(content: string): Array<{ type: string; text: string }> {
  const flags: Array<{ type: string; text: string }> = [];
  const pattern = /\[VERIFY:\s*(citation|section|procedure|authority|[^\]]+)\]/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    flags.push({ type: match[1].toLowerCase().split(':')[0].trim(), text: match[0] });
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
    /Rule\s+\d+(?:\(\d+\))?(?:\s+High Court Rules)?/gi,
  ];
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) statutes.push(...matches);
  }
  return [...new Set(statutes)].slice(0, 10);
}

function extractSuggestedCases(content: string): string[] {
  const casePattern = /[A-Z][a-z]+(?: [A-Z][a-z]+)* v [A-Z][a-z]+(?: [A-Z][a-z]+)*(?:\s+\d{4}\s*\(\d+\)\s+(?:ZLR|SACR|SA)\s+\d+)?/g;
  const matches = content.match(casePattern) || [];
  return [...new Set(matches)].slice(0, 8);
}

// ─── Case Deep Dive endpoint ────────────────────────────────────────────────
router.post("/council/case-deep-dive", async (req: Request, res: Response) => {
  const { query, userId } = req.body;

  if (!query || typeof query !== "string" || query.trim().length < 3) {
    res.status(400).json({ error: "Bad Request", message: "query must be at least 3 characters" });
    return;
  }

  const trimmedQuery = query.trim();

  try {
    // ── Step 1: Run DB search + ZimLII scraper in parallel ─────────────────
    const searchTerm = `%${trimmedQuery.toLowerCase()}%`;

    const [dbCases, dbStatutes, zimliiResult] = await Promise.all([
      db
        .select()
        .from(casesTable)
        .where(
          or(
            ilike(casesTable.citation, searchTerm),
            ilike(casesTable.title, searchTerm),
            ilike(casesTable.principle, searchTerm),
            ilike(casesTable.headnote, searchTerm),
            sql`EXISTS (SELECT 1 FROM unnest(${casesTable.subjectTags}) tag WHERE lower(tag) LIKE ${searchTerm})`
          )
        )
        .limit(5),

      db
        .select()
        .from(statutesTable)
        .where(
          or(
            ilike(statutesTable.title, searchTerm),
            ilike(statutesTable.summary, searchTerm),
            sql`EXISTS (SELECT 1 FROM unnest(${statutesTable.tags}) tag WHERE lower(tag) LIKE ${searchTerm})`
          )
        )
        .limit(3),

      searchZimLII(trimmedQuery).catch(() => null),
    ]);

    // ── Step 2: Build context-enriched deep dive prompt ────────────────────
    const dbContext = dbCases.length > 0
      ? `\n\nFOUND IN LOCAL LEX SUPERIOR DATABASE:\n${dbCases.map(c =>
          `- ${c.citation} | ${c.court} | ${c.year ?? "year unknown"}\n  Title: ${c.title}\n  Principle: ${c.principle ?? "N/A"}\n  Headnote: ${c.headnote?.slice(0, 200) ?? "N/A"}`
        ).join("\n\n")}`
      : "\n\nNOT FOUND IN LOCAL DATABASE — rely on your training knowledge and flag uncertain citations with [VERIFY].";

    const statuteContext = dbStatutes.length > 0
      ? `\n\nRELATED STATUTES IN DATABASE:\n${dbStatutes.map(s =>
          `- ${s.title} (${s.chapter ?? "Chapter unknown"}) — ${s.summary?.slice(0, 120) ?? "N/A"}`
        ).join("\n")}`
      : "";

    const zimliiContext = zimliiResult && zimliiResult.results.length > 0
      ? `\n\nZIMLII SEARCH RESULTS (${zimliiResult.source === "live" ? "live scrape" : "curated index"}, ${zimliiResult.results.length} matches):\n${zimliiResult.results.slice(0, 6).map(r =>
          `- ${r.title}${r.citation ? ` | ${r.citation}` : ""}${r.court ? ` | ${r.court}` : ""}${r.date ? ` | ${r.date}` : ""}\n  URL: ${r.url}${r.snippet ? `\n  Snippet: ${r.snippet.slice(0, 150)}` : ""}`
        ).join("\n\n")}`
      : "";

    const zimliiUrl = buildZimLIISearchUrl(trimmedQuery);

    const deepDivePrompt = `CASE DEEP DIVE REQUEST: "${trimmedQuery}"

ZimLII Research Link: ${zimliiUrl}
${dbContext}${statuteContext}${zimliiContext}

Please perform the complete 8-step Research Pipeline analysis for this case. Structure your response with clear headings for each step. For the Citation Chain step (Step 7), identify at least 3 upstream authorities this case relied on and, where possible, 2-3 downstream cases that have subsequently applied or distinguished it. Where ZimLII results are provided above, reference their URLs as research sources. Flag every uncertain citation with [VERIFY: citation]. Include the ZimLII search link above in Step 1.`;

    // ── Step 3: SSE stream the analysis ────────────────────────────────────
    const member = COUNCIL_MEMBERS.find(m => m.id === "case-law-analyst")!;

    // Create a consultation record
    const [consultation] = await db.insert(consultationsTable).values({
      userId: userId || "anonymous",
      title: `[Deep Dive] ${trimmedQuery.slice(0, 60)}`,
      practiceArea: "case_law",
    }).returning();

    await db.insert(messagesTable).values({
      consultationId: consultation.id,
      role: "user",
      content: deepDivePrompt,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Consultation-Id", consultation.id);
    res.flushHeaders();

    // Send structured metadata immediately so the UI can render links/DB hits and ZimLII results
    res.write(`data: ${JSON.stringify({
      meta: {
        query: trimmedQuery,
        zimliiUrl,
        dbHits: dbCases.length,
        dbCases: dbCases.map(c => ({ citation: c.citation, title: c.title, court: c.court, year: c.year })),
        dbStatutes: dbStatutes.map(s => ({ title: s.title, chapter: s.chapter })),
        zimliiHits: zimliiResult?.results.length ?? 0,
        zimliiSource: zimliiResult?.source ?? "empty",
        zimliiResults: (zimliiResult?.results ?? []).slice(0, 8).map(r => ({
          title: r.title,
          url: r.url,
          court: r.court,
          date: r.date,
          citation: r.citation,
          documentType: r.documentType,
          snippet: r.snippet?.slice(0, 200),
        })),
      }
    })}\n\n`);

    const stream = await openai.chat.completions.create({
      model: member.model,
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: member.systemPrompt },
        { role: "user", content: deepDivePrompt },
      ],
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const flags = extractVerifyFlags(fullResponse);
    const detectedStatutes = extractDetectedStatutes(fullResponse);
    const suggestedCases = extractSuggestedCases(fullResponse);

    await db.insert(messagesTable).values({
      consultationId: consultation.id,
      role: "assistant",
      content: fullResponse,
      providerUsed: "Lex Superior AI (Case Law Analyst — Deep Dive)",
      fromCache: false,
      flags,
    });

    res.write(`data: ${JSON.stringify({
      done: true,
      flags,
      detectedStatutes,
      suggestedCases,
      consultationId: consultation.id,
      zimliiUrl,
    })}\n\n`);
    res.end();

  } catch (err) {
    req.log?.error?.({ err }, "Case deep dive error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error", message: (err as Error).message });
    } else {
      res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
      res.end();
    }
  }
});

router.get("/council/members", (_req, res) => {
  res.json(COUNCIL_MEMBERS.map(m => ({
    id: m.id,
    name: m.name,
    title: m.title,
    specialty: m.specialty,
    description: m.description,
    icon: m.icon,
    color: m.color,
  })));
});

router.post("/council/chat", async (req: Request, res: Response) => {
  const { message, memberId = "general-counsel", consultationId, userId } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Bad Request", message: "message is required" });
    return;
  }

  const member = COUNCIL_MEMBERS.find(m => m.id === memberId);
  if (!member) {
    res.status(400).json({ error: "Bad Request", message: "Unknown council member" });
    return;
  }

  try {
    let activeConsultationId = consultationId;
    if (!activeConsultationId) {
      const title = `[${member.name}] ${message.slice(0, 50)}${message.length > 50 ? "..." : ""}`;
      const [newConsultation] = await db.insert(consultationsTable).values({
        userId: userId || "anonymous",
        title,
        practiceArea: member.specialty,
      }).returning();
      activeConsultationId = newConsultation.id;
    }

    const previousMessages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.consultationId, activeConsultationId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(8);

    const conversationHistory = previousMessages.reverse().map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    await db.insert(messagesTable).values({
      consultationId: activeConsultationId,
      role: "user",
      content: message,
    });

    const cacheKey = getCacheKey(memberId, message);
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry && conversationHistory.length === 0) {
      const flags = extractVerifyFlags(cached.content);
      res.json({
        content: cached.content,
        providerUsed: `Lex Superior AI (${member.name})`,
        fromCache: true,
        flags,
        detectedStatutes: extractDetectedStatutes(cached.content),
        suggestedCases: extractSuggestedCases(cached.content),
        consultationId: activeConsultationId,
        memberId,
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Consultation-Id", activeConsultationId);
    res.setHeader("X-Member-Id", memberId);
    res.flushHeaders();

    const moduleContext = isCivilProcedureQuery(message)
      ? await retrieveCivilProcedureContext(message).catch(() => "")
      : "";
    const systemContent = moduleContext
      ? `${member.systemPrompt}\n\n${moduleContext}`
      : member.systemPrompt;

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemContent },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: member.model,
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const flags = extractVerifyFlags(fullResponse);
    const detectedStatutes = extractDetectedStatutes(fullResponse);
    const suggestedCases = extractSuggestedCases(fullResponse);

    await db.insert(messagesTable).values({
      consultationId: activeConsultationId,
      role: "assistant",
      content: fullResponse,
      providerUsed: `Lex Superior AI (${member.name})`,
      fromCache: false,
      flags,
    });

    await db.update(consultationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(consultationsTable.id, activeConsultationId));

    queryCache.set(cacheKey, {
      content: fullResponse,
      expiry: Date.now() + 24 * 60 * 60 * 1000,
    });

    res.write(`data: ${JSON.stringify({
      done: true,
      flags,
      detectedStatutes,
      suggestedCases,
      consultationId: activeConsultationId,
      memberId,
    })}\n\n`);
    res.end();
  } catch (err) {
    req.log?.error?.({ err }, "Council chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error", message: (err as Error).message });
    } else {
      res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
      res.end();
    }
  }
});

export default router;
