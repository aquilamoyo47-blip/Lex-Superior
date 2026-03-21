import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Scale, ShieldAlert, HeartHandshake } from "lucide-react";

export default function About() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <Scale className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl font-display font-bold mb-4">About Lex Superior</h1>
          <p className="text-xl text-muted-foreground">Advancing legal access and efficiency in Zimbabwe.</p>
        </div>

        <div className="space-y-12">
          <section className="prose prose-invert prose-lg max-w-none">
            <h2 className="font-display text-primary">Mission Statement</h2>
            <p>
              Lex Superior was developed to empower legal practitioners and citizens navigating the complexities of civil litigation in Zimbabwe's Superior Courts. By harnessing advanced LLM architectures specifically tuned to Zimbabwean statutes, rules, and case law, we aim to reduce research time and improve drafting precision.
            </p>
          </section>

          <section className="prose prose-invert prose-lg max-w-none">
            <h2 className="font-display text-primary">Knowledge Base Scope</h2>
            <p>
              The system operates strictly within the domain of <strong>Civil Law and Civil Litigation</strong>. It does not handle criminal matters. The embedded knowledge base includes the High Court Rules SI 202/2021, Supreme Court Rules, Deeds Registries Act, and foundational Civil Procedure principles.
            </p>
            <div className="bg-secondary p-6 rounded-xl border border-white/5 my-6 flex items-start gap-4">
              <HeartHandshake className="w-6 h-6 text-primary shrink-0 mt-1" />
              <p className="m-0 text-sm">
                Special acknowledgment to the scholarly works that formed the procedural foundations of this system, including the Civil Procedure Notes (BLAW 302).
              </p>
            </div>
          </section>

          <section className="bg-destructive/10 border border-destructive/20 p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-8 h-8 text-destructive" />
              <h2 className="text-2xl font-bold text-destructive m-0 font-display">Legal Disclaimer</h2>
            </div>
            <p className="text-foreground/90 leading-relaxed">
              Lex Superior is an AI software tool designed for research and drafting assistance. 
              <strong> It is not a lawyer and does not provide legal advice.</strong> The use of this system does not create an attorney-client relationship. All generated documents, citations, and procedural guidance must be independently verified by a registered legal practitioner before use in any court of law.
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
