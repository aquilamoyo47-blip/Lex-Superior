import { Link } from "wouter";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, FileText, Search, Shield, BookOpen, Clock, ArrowRight, Gavel, FileCheck, BrainCircuit } from "lucide-react";

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <AppLayout>
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium mb-8 text-sm uppercase tracking-widest">
              <Scale className="w-4 h-4" />
              Superior Courts of Zimbabwe
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              Your Expert Legal Advocate for <br className="hidden md:block"/>
              <span className="text-gradient-gold">Civil Litigation</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Harness advanced AI to draft pleadings, research case law, and navigate procedural rules with unprecedented precision and authority.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/chat">
                <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl w-full sm:w-auto shadow-lg shadow-primary/25 hover:-translate-y-1 transition-all">
                  Start Consultation
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/library">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold rounded-xl w-full sm:w-auto border-white/20 hover:bg-white/5 hover:text-foreground transition-all">
                  Browse Legal Library
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Comprehensive Legal Arsenal</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Specialised exclusively in Zimbabwean civil law, equipped to handle complex litigation and advisory matters.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FileText, title: "Legal Drafting", desc: "Generate precise summons, declarations, and applications aligned with High Court Rules SI 202 of 2021." },
              { icon: Search, title: "Case Law Research", desc: "Instantly locate relevant Supreme and High Court precedents to bolster your legal arguments." },
              { icon: Gavel, title: "Procedural Guidance", desc: "Step-by-step navigation of complex civil procedures, from pre-trial conferences to appeals." },
              { icon: BrainCircuit, title: "Legal Opinions", desc: "Comprehensive analysis of legal principles applied to your specific factual matrix." },
              { icon: BookOpen, title: "Statute Interpretation", desc: "In-depth breakdown of Zimbabwean legislation with clear, practical explanations." },
              { icon: FileCheck, title: "Court Doc Generator", desc: "Auto-fill standard High Court forms and deeds registry documents with accurate details." },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="glass-card h-full hover:-translate-y-1 hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 font-display">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-card/30 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How Lex Superior AI Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">A sophisticated AI pipeline engineered for legal precision.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 -translate-y-1/2 z-0" />

            {[
              { step: "01", title: "Context Loading", desc: "Submit your query. The system instantly loads relevant Zimbabwean statutes, rules, and BLAW 302 principles." },
              { step: "02", title: "Deep Analysis", desc: "Advanced AI (gpt-5.2 via Replit AI) parses the legal matrix and formulates structured arguments." },
              { step: "03", title: "Quality Review", desc: "Outputs are cross-checked. Uncertain citations are flagged with [VERIFY] tags for practitioner review." }
            ].map((item, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-background border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary font-display mb-6 shadow-[0_0_30px_rgba(201,168,76,0.2)]">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
