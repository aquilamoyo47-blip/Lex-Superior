import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Gavel, Clock, AlertTriangle, FileText } from "lucide-react";

const GUIDES = [
  {
    id: "court-app",
    title: "How to Institute a Court Application",
    rule: "Rule 59",
    steps: [
      {
        title: "Draft Form 23 & Founding Affidavit",
        content: "Prepare a Court Application in Form 23. Attach a Founding Affidavit containing the facts establishing the cause of action.",
        warning: "Ensure all essential averments are in the founding affidavit; you cannot build your case in the answering affidavit."
      },
      {
        title: "Filing and Service",
        content: "File with the Registrar. Serve on the respondent. They have 10 days to file a Notice of Opposition (Form 24).",
        timeLimit: "10 Days to oppose"
      },
      {
        title: "Answering Affidavit",
        content: "If opposed, applicant has 10 days to file an Answering Affidavit.",
        timeLimit: "10 Days"
      }
    ]
  },
  {
    id: "urgent-chamber",
    title: "Urgent Chamber Application",
    rule: "Rule 60",
    steps: [] // Empty for brevity
  },
  {
    id: "summary-judgment",
    title: "Summary Judgment Procedure",
    rule: "Rule 30",
    steps: [] // Empty for brevity
  }
];

export default function Guides() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <Gavel className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">Procedural Guides</h1>
          <p className="text-xl text-muted-foreground">Interactive step-by-step roadmaps for civil litigation in the Superior Courts.</p>
        </div>

        <div className="space-y-6">
          {GUIDES.map(guide => (
            <Card key={guide.id} className="glass-card border-white/10 overflow-hidden">
              <CardHeader className="bg-card/50 border-b border-white/5 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-display mb-2">{guide.title}</CardTitle>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {guide.rule}
                    </Badge>
                  </div>
                  <FileText className="w-6 h-6 text-muted-foreground opacity-50" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {guide.steps.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {guide.steps.map((step, idx) => (
                      <AccordionItem key={idx} value={`step-${idx}`} className="border-white/5 px-6">
                        <AccordionTrigger className="hover:no-underline py-4 text-left">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-sm font-bold text-muted-foreground">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-lg">{step.title}</span>
                            {step.timeLimit && (
                              <Badge variant="outline" className="ml-auto bg-primary/5 border-primary/30 text-primary whitespace-nowrap">
                                <Clock className="w-3 h-3 mr-1" /> {step.timeLimit}
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pl-12 pr-4 text-muted-foreground leading-relaxed text-base">
                          {step.content}
                          {step.warning && (
                            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex gap-3 items-start">
                              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                              <p className="text-sm font-medium">{step.warning}</p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Detailed steps are being loaded...
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
