import { Router, type IRouter } from "express";
import { runLegalPipeline } from "../lib/aiPipeline";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const DOCUMENT_TEMPLATES: Record<string, string> = {
  "Court Application (Form 23)": `Draft a formal Court Application for the High Court of Zimbabwe in accordance with Rule 59 of the High Court Rules SI 202 of 2021 and Form 23. Include all required elements: notice of motion, founding affidavit structure with numbered paragraphs, prayers for relief, and service endorsement.`,
  "Chamber Application (Form 25)": `Draft a Chamber Application for the High Court of Zimbabwe in accordance with Rule 60 of the High Court Rules SI 202 of 2021 and Form 25. Include the certificate of urgency requirements and ex parte application structure.`,
  "Urgent Chamber Application": `Draft an Urgent Chamber Application for the High Court of Zimbabwe. Include certificate of urgency, grounds establishing urgency under the Kuvarega test, interim and final relief sought, and founding affidavit structure.`,
  "Summons (Form 1)": `Draft a Summons for the High Court of Zimbabwe in accordance with Rule 12 of the High Court Rules SI 202 of 2021 and Form 1. Include particulars of claim or reference to declaration, appearance to defend notice, and proper endorsements.`,
  "Declaration": `Draft a Declaration for the High Court of Zimbabwe in accordance with Rule 18 of the High Court Rules SI 202 of 2021. Number all paragraphs consecutively. Include all essential elements of the cause of action with proper particularity.`,
  "Plea": `Draft a Plea for the High Court of Zimbabwe in accordance with Rule 19 of the High Court Rules SI 202 of 2021. Address each allegation in the declaration, admit, deny or confess and avoid each allegation.`,
  "Founding Affidavit": `Draft a Founding Affidavit for use in High Court application proceedings in Zimbabwe in accordance with Rule 59 and 60 of the High Court Rules SI 202 of 2021. Include deponent details, facts in support of relief sought, numbered paragraphs, and prayer.`,
  "Notice of Appeal to Supreme Court": `Draft a Notice of Appeal to the Supreme Court of Zimbabwe in accordance with Rule 5 of the Supreme Court Rules SI 84 of 2018. Include grounds of appeal, relief sought, and proper formatting requirements.`,
  "Legal Opinion Letter": `Draft a formal Legal Opinion letter on the subject matter. Include scope of opinion, facts, legal analysis citing applicable Zimbabwe statutes and case law, conclusion, and standard disclaimer.`,
  "Demand Letter": `Draft a formal Demand Letter in accordance with Zimbabwe civil law practice. Include statement of facts, legal basis for claim, specific demand, time period for compliance, and consequences of non-compliance.`,
};

router.post("/documents/generate", async (req, res) => {
  const { documentType, caseDetails, additionalInfo, practiceArea = "procedure" } = req.body;

  if (!documentType || !caseDetails) {
    res.status(400).json({ error: "Bad Request", message: "documentType and caseDetails are required" });
    return;
  }

  try {
    const baseTemplate = DOCUMENT_TEMPLATES[documentType] || `Draft a ${documentType} for the High Court of Zimbabwe.`;

    const prompt = `${baseTemplate}

CASE DETAILS:
- Case Number: ${caseDetails.caseNumber || "HC ____/____"}
- Applicant/Plaintiff: ${caseDetails.applicant || "[APPLICANT]"}
- Respondent/Defendant: ${caseDetails.respondent || "[RESPONDENT]"}
- City/Location: ${caseDetails.city || "Harare"}
- Legal Practitioner: ${caseDetails.legalPractitioner || "[LEGAL PRACTITIONER]"}
- Law Firm: ${caseDetails.firm || "[FIRM NAME]"}
${caseDetails.factsOfMatter ? `\nFACTS OF THE MATTER:\n${caseDetails.factsOfMatter}` : ""}
${caseDetails.groundsArguments ? `\nGROUNDS / LEGAL ARGUMENTS:\n${caseDetails.groundsArguments}` : ""}
${caseDetails.reliefSought ? `\nRELIEF SOUGHT:\n${caseDetails.reliefSought}` : ""}
${caseDetails.attachedDocuments && caseDetails.attachedDocuments.length > 0 ? `\nSUPPORTING DOCUMENTS ATTACHED:\n${caseDetails.attachedDocuments.map((name: string) => `- ${name}`).join("\n")}` : ""}
${additionalInfo ? `\nADDITIONAL INFORMATION:\n${additionalInfo}` : ""}

Generate the complete document with:
1. Proper Zimbabwe High Court header (IN THE HIGH COURT OF ZIMBABWE HELD AT ${(caseDetails.city || "HARARE").toUpperCase()})
2. Case number and parties
3. Full document body with consecutively numbered paragraphs
4. Signature block with legal practitioner details
5. Date block

Format with clear section headings and follow Zimbabwe High Court document standards.`;

    const result = await runLegalPipeline(prompt, practiceArea);

    res.json({
      id: randomUUID(),
      content: result.content,
      documentType,
      providerUsed: result.providerUsed,
      fromCache: result.fromCache,
    });
  } catch (err) {
    req.log.error({ err }, "Document generation error");
    res.status(500).json({ error: "Internal Server Error", message: (err as Error).message });
  }
});

export default router;
