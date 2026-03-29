import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  Scale, FileText, Search, Shield, BookOpen, ArrowRight,
  Gavel, FileCheck, BrainCircuit, X, Play, CheckCircle, Users, Zap, Lock
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Legal Drafting",
    desc: "Generate court-ready pleadings, declarations, and applications aligned with High Court Rules SI 202 of 2021.",
  },
  {
    icon: Search,
    title: "Case Law Research",
    desc: "Instantly surface Supreme and High Court precedents with ratio decidendi analysis and citation chains.",
  },
  {
    icon: Gavel,
    title: "Procedural Guidance",
    desc: "Step-by-step navigation from pre-trial conferences to appeals — deadlines, pitfalls, and filing requirements.",
  },
  {
    icon: BrainCircuit,
    title: "Legal Opinions",
    desc: "Comprehensive analysis of legal principles applied to your specific factual matrix.",
  },
  {
    icon: BookOpen,
    title: "Statute Interpretation",
    desc: "In-depth breakdown of Zimbabwean legislation with clear, practical explanations.",
  },
  {
    icon: FileCheck,
    title: "Document Generation",
    desc: "Auto-fill standard High Court forms and deeds registry documents with precise, attorney-ready detail.",
  },
];

const TRUST_ITEMS = [
  { icon: Shield, label: "Verified Legal Sources" },
  { icon: Lock, label: "Secure & Confidential" },
  { icon: Zap, label: "Instant AI Analysis" },
  { icon: Users, label: "Used by Legal Practitioners" },
];

function DemoModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", organisation: "", email: "", description: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg glass-card rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-display font-bold text-foreground">Request a Demo</h3>
              <p className="text-sm text-muted-foreground mt-1">We'll reach out to arrange a personalised walkthrough.</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-display font-bold text-lg text-foreground mb-2">Request received</h4>
              <p className="text-muted-foreground text-sm">Thank you, {form.name}. Our team will be in touch within one business day.</p>
              <Button onClick={onClose} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
                <Input
                  placeholder="Adv. Jane Mupari"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-card border-white/10 focus:border-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Organisation</label>
                <Input
                  placeholder="Mupari & Associates Legal Practitioners"
                  value={form.organisation}
                  onChange={(e) => setForm(f => ({ ...f, organisation: e.target.value }))}
                  className="bg-card border-white/10 focus:border-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                <Input
                  type="email"
                  placeholder="jane@mupari.co.zw"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-card border-white/10 focus:border-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">How can we help? <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  placeholder="Describe your practice area and what you'd like to explore..."
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full min-h-[80px] bg-card border border-white/10 rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none transition-all"
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
              >
                Submit request
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated, login } = useAuth();
  const [showDemo, setShowDemo] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("demo") === "1";
    }
    return false;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <AppLayout>
      <AnimatePresence>
        {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
      </AnimatePresence>

      {/* Hero */}
      <section className="relative pt-28 pb-36 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold mb-8 text-xs uppercase tracking-widest"
            >
              <Scale className="w-3.5 h-3.5" />
              Superior Courts of Zimbabwe
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl sm:text-6xl md:text-7xl font-display font-bold leading-[1.06] mb-6 tracking-tight"
            >
              The AI legal advocate<br className="hidden sm:block" />
              built for{" "}
              <span className="text-gradient-gold">Zimbabwe</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto"
            >
              Draft pleadings, research case law, and navigate civil procedure with an AI trained exclusively on Zimbabwe's Superior Courts legal framework.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              {isAuthenticated ? (
                <Link href="/chat">
                  <Button
                    size="lg"
                    className="h-13 px-8 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl w-full sm:w-auto shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                  >
                    Open workspace
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  onClick={login}
                  className="h-13 px-8 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl w-full sm:w-auto shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                >
                  Get started — it's free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowDemo(true)}
                className="h-13 px-8 text-base font-semibold rounded-xl w-full sm:w-auto border-white/15 hover:bg-white/5 transition-all"
              >
                Request a Demo
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              variants={itemVariants}
              className="mt-12 flex flex-wrap items-center justify-center gap-6"
            >
              {TRUST_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="w-4 h-4 text-primary/60 shrink-0" />
                  {item.label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Product Demo Video */}
      <section className="py-24 bg-card/20 border-t border-white/5 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">See it in action</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Watch how legal practitioners use Lex Superior AI to cut research time and produce court-ready documents.</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl overflow-hidden border border-white/10 bg-card/40 shadow-2xl shadow-black/40 aspect-video flex items-center justify-center group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Play className="w-8 h-8 text-primary ml-1" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">Product demo — 3 min walkthrough</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-card/80 to-transparent" />
            <div className="absolute top-4 left-4 flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
          </motion.div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Full demo available on request. <button onClick={() => setShowDemo(true)} className="text-primary hover:underline">Book a walkthrough</button>
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Everything you need for civil litigation</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Specialised exclusively in Zimbabwean civil law — from summons to the Supreme Court.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
              >
                <div className="glass-card h-full p-8 rounded-2xl border border-white/5 hover:-translate-y-1 hover:border-primary/30 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/10">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 font-display">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-card/20 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Purpose-built for Zimbabwe</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">A sophisticated pipeline engineered specifically for the Superior Courts' legal framework.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-8 left-[22%] right-[22%] h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
            {[
              { step: "01", title: "Context Loading", desc: "Submit your query. The system loads relevant Zimbabwean statutes, High Court Rules SI 202/2021, and BLAW 302 principles instantly." },
              { step: "02", title: "Deep Analysis", desc: "Replit AI parses the legal matrix, structures authoritative arguments, and applies the correct procedural framework." },
              { step: "03", title: "Quality Review", desc: "Outputs are cross-checked. Uncertain citations are flagged with [VERIFY] tags — always explicit, never silent." },
            ].map((item, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xl font-bold text-primary font-display mb-5 shadow-[0_0_24px_rgba(201,168,76,0.15)]">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2 font-display">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-12 border border-primary/20 shadow-[0_0_80px_rgba(201,168,76,0.05)]"
          >
            <Scale className="w-10 h-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Ready to elevate your practice?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Join legal practitioners across Zimbabwe using AI to research faster, draft better, and argue more precisely.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isAuthenticated ? (
                <Link href="/chat">
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20">
                    Open workspace <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  onClick={login}
                  className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20"
                >
                  Get started free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowDemo(true)}
                className="h-12 px-8 font-semibold rounded-xl border-white/15 hover:bg-white/5"
              >
                Request a Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </AppLayout>
  );
}
