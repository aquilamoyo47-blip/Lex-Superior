import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Scale, FileText, BookOpen, ClipboardList, Landmark,
  Send, Copy, Download, Bookmark, AlertTriangle, User,
  Brain, PlusCircle, ChevronLeft, Sparkles, Loader2,
  Search, ExternalLink, Database, GitFork, X, Mic, Paperclip
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ZimLIIResult {
  title: string;
  url: string;
  court?: string;
  date?: string;
  citation?: string;
  documentType?: string;
  snippet?: string;
}

interface DeepDiveMeta {
  query: string;
  zimliiUrl: string;
  dbHits: number;
  dbCases: Array<{ citation: string; title: string; court: string; year: number | null }>;
  dbStatutes: Array<{ title: string; chapter: string | null }>;
  zimliiHits: number;
  zimliiSource: "live" | "sample" | "empty";
  zimliiResults: ZimLIIResult[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Scale, FileText, BookOpen, ClipboardList, Landmark,
};

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; glow: string }> = {
  gold:   { bg: "bg-primary/10",   border: "border-primary/30",   badge: "bg-primary/20 text-primary",         glow: "shadow-primary/20" },
  blue:   { bg: "bg-blue-500/10",  border: "border-blue-500/30",  badge: "bg-blue-500/20 text-blue-300",        glow: "shadow-blue-500/20" },
  purple: { bg: "bg-purple-500/10",border: "border-purple-500/30",badge: "bg-purple-500/20 text-purple-300",    glow: "shadow-purple-500/20" },
  green:  { bg: "bg-green-500/10", border: "border-green-500/30", badge: "bg-green-500/20 text-green-300",      glow: "shadow-green-500/20" },
  amber:  { bg: "bg-amber-500/10", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-300",      glow: "shadow-amber-500/20" },
};

interface CouncilMember {
  id: string;
  name: string;
  title: string;
  specialty: string;
  description: string;
  icon: string;
  color: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  flags?: Array<{ type: string; text: string }>;
  detectedStatutes?: string[];
  suggestedCases?: string[];
  memberId?: string;
}

const GLOW_COLORS: Record<string, string> = {
  gold:   "rgba(201,168,76,0.4)",
  blue:   "rgba(59,130,246,0.4)",
  purple: "rgba(168,85,247,0.4)",
  green:  "rgba(34,197,94,0.4)",
  amber:  "rgba(245,158,11,0.4)",
};

function MemberCard({ member, onSelect }: { member: CouncilMember; onSelect: () => void }) {
  const Icon = ICON_MAP[member.icon] || Scale;
  const colors = COLOR_MAP[member.color] || COLOR_MAP.gold;
  const glowColor = GLOW_COLORS[member.color] || GLOW_COLORS.gold;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card
        onClick={onSelect}
        className={cn(
          "cursor-pointer transition-all duration-300 group border relative overflow-hidden shimmer-border",
          colors.border,
          "bg-card/40 hover:bg-card/70 backdrop-blur-sm"
        )}
        style={{ "--hover-glow": glowColor } as any}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${glowColor.replace("0.4", "0.3")}, 0 0 30px ${glowColor.replace("0.4", "0.15")}, 0 8px 32px rgba(0,0,0,0.3)`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "";
        }}
      >
        <CardContent className="p-6 relative z-10">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 border transition-all duration-300",
            colors.bg, colors.border
          )}
            style={{ transition: "box-shadow 0.3s ease" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${glowColor}`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            <Icon className={cn("w-7 h-7", colors.badge.split(" ")[1])} />
          </div>
          <h3 className="font-display font-bold text-lg text-foreground mb-1">{member.name}</h3>
          <Badge className={cn("text-xs mb-3 font-medium border-0", colors.badge)}>{member.title}</Badge>
          <p className="text-sm text-muted-foreground leading-relaxed">{member.description}</p>
          <Button
            className={cn(
              "w-full mt-5 font-semibold transition-all duration-300",
              member.color === "gold"
                ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-[0_0_16px_rgba(201,168,76,0.4)]"
                : "bg-white/5 hover:bg-white/10 text-foreground border border-white/10"
            )}
          >
            <Sparkles className="w-4 h-4 mr-2" /> Consult {member.name}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MessageHoverToolbar({ onCopy }: { onCopy: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute -top-10 right-2 z-10 flex items-center gap-0.5 bg-card/90 backdrop-blur-xl border border-white/10 rounded-xl px-1.5 py-1 shadow-xl shadow-black/40"
      style={{ boxShadow: "0 0 0 1px rgba(201,168,76,0.15), 0 8px 24px rgba(0,0,0,0.5)" }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
        onClick={onCopy}
        title="Copy"
      >
        <Copy className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg"
        title="Download"
      >
        <Download className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
        title="Save"
      >
        <Bookmark className="w-3 h-3" />
      </Button>
    </motion.div>
  );
}

function StreamingDot() {
  return (
    <span className="inline-flex gap-0.5 ml-1 align-middle">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export default function Council() {
  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<CouncilMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [detectedStatutes, setDetectedStatutes] = useState<string[]>([]);
  const [suggestedCases, setSuggestedCases] = useState<string[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Case Deep Dive state (Case Law Analyst only)
  const [deepDiveMode, setDeepDiveMode] = useState(false);
  const [deepDiveInput, setDeepDiveInput] = useState("");
  const [deepDiveMeta, setDeepDiveMeta] = useState<DeepDiveMeta | null>(null);

  useEffect(() => {
    fetch("/api/council/members")
      .then(r => r.json())
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const selectMember = useCallback((member: CouncilMember) => {
    setSelectedMember(member);
    setMessages([]);
    setConsultationId(null);
    setDetectedStatutes([]);
    setSuggestedCases([]);
    setInput("");
    setDeepDiveMode(false);
    setDeepDiveInput("");
    setDeepDiveMeta(null);
  }, []);

  // ── Case Deep Dive handler ────────────────────────────────────────────────
  const handleDeepDive = useCallback(async () => {
    if (!deepDiveInput.trim() || isStreaming) return;

    const query = deepDiveInput.trim();
    setDeepDiveInput("");
    setIsStreaming(true);
    setDeepDiveMeta(null);

    // Add user message showing the deep dive query
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `🔍 **Case Deep Dive:** ${query}`,
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
      memberId: "case-law-analyst",
    }]);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/council/case-deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          userId: localStorage.getItem("userId") || "anonymous",
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const newConsultationId = response.headers.get("x-consultation-id");
      if (newConsultationId) setConsultationId(newConsultationId);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.meta) {
              setDeepDiveMeta(data.meta);
            }
            if (data.content) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + data.content }
                  : m
              ));
            }
            if (data.done) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, streaming: false, flags: data.flags || [], detectedStatutes: data.detectedStatutes || [], suggestedCases: data.suggestedCases || [] }
                  : m
              ));
              if (data.detectedStatutes?.length) setDetectedStatutes(data.detectedStatutes);
              if (data.suggestedCases?.length) setSuggestedCases(data.suggestedCases);
              if (data.consultationId) setConsultationId(data.consultationId);
            }
            if (data.error) throw new Error(data.error);
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: "Deep dive failed. Please try again.", streaming: false }
          : m
      ));
      toast.error("Deep dive error. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [deepDiveInput, isStreaming]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedMember || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMsg]);
    const userInput = input;
    setInput("");
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
      memberId: selectedMember.id,
    }]);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/council/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userInput,
          memberId: selectedMember.id,
          consultationId,
          userId: localStorage.getItem("userId") || "anonymous",
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        const newConsultationId = response.headers.get("x-consultation-id");
        if (newConsultationId && !consultationId) setConsultationId(newConsultationId);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.content }
                    : m
                ));
              }
              if (data.done) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, streaming: false, flags: data.flags || [], detectedStatutes: data.detectedStatutes || [], suggestedCases: data.suggestedCases || [] }
                    : m
                ));
                if (data.detectedStatutes?.length) setDetectedStatutes(data.detectedStatutes);
                if (data.suggestedCases?.length) setSuggestedCases(data.suggestedCases);
                if (data.consultationId) setConsultationId(data.consultationId);
              }
              if (data.error) throw new Error(data.error);
            } catch { /* skip malformed chunks */ }
          }
        }
      } else {
        const data = await response.json();
        if (data.consultationId) setConsultationId(data.consultationId);
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: data.content, streaming: false, flags: data.flags || [], detectedStatutes: data.detectedStatutes || [], suggestedCases: data.suggestedCases || [] }
            : m
        ));
        if (data.detectedStatutes?.length) setDetectedStatutes(data.detectedStatutes);
        if (data.suggestedCases?.length) setSuggestedCases(data.suggestedCases);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: "An error occurred. Please try again.", streaming: false }
          : m
      ));
      toast.error("Connection error. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [input, selectedMember, isStreaming, consultationId]);

  const colors = selectedMember ? COLOR_MAP[selectedMember.color] || COLOR_MAP.gold : COLOR_MAP.gold;
  const ActiveIcon = selectedMember ? (ICON_MAP[selectedMember.icon] || Scale) : Scale;

  return (
    <AppLayout>
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-80px)]">

        {!selectedMember ? (
          /* ─── Council Selection View ─── */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
                  <Sparkles className="w-4 h-4" />
                  AI Legal Council
                </div>
                <h1 className="font-display font-bold text-4xl sm:text-5xl text-foreground mb-4">
                  Your Expert <span className="text-gradient-gold">Legal Council</span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Five specialised AI advocates, each an expert in their domain of Zimbabwe civil law. Select a council member to begin your consultation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="border-white/5 bg-card/20 animate-pulse">
                      <CardContent className="p-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 mb-5" />
                        <div className="h-5 bg-white/5 rounded mb-2 w-3/4" />
                        <div className="h-3 bg-white/5 rounded mb-4 w-1/2" />
                        <div className="space-y-2">
                          <div className="h-3 bg-white/5 rounded w-full" />
                          <div className="h-3 bg-white/5 rounded w-5/6" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  members.map(member => (
                    <MemberCard key={member.id} member={member} onSelect={() => selectMember(member)} />
                  ))
                )}
              </div>

              <div className="mt-12 p-6 rounded-2xl bg-card/30 border border-white/5 text-center">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Powered by Lex Superior AI</strong> — All council members are specialised AI models trained on Zimbabwe civil law.<br />
                  Outputs constitute legal research assistance only and not formal legal advice.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ─── Active Council Chat ─── */
          <>
            {/* Left: Member Info Sidebar */}
            <motion.aside
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-72 border-r border-white/5 bg-background/50 flex-col hidden lg:flex"
            >
              <div className="p-4 border-b border-white/5">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedMember(null)}
                  className="w-full justify-start text-muted-foreground hover:text-foreground mb-3"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> All Council Members
                </Button>
                <div className="relative mb-4 w-fit">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300",
                    colors.bg, colors.border
                  )}
                    style={{ boxShadow: isStreaming ? `0 0 20px ${GLOW_COLORS[selectedMember.color] || GLOW_COLORS.gold}` : undefined }}
                  >
                    <ActiveIcon className={cn("w-8 h-8", colors.badge.split(" ")[1])} />
                  </div>
                  {/* LIVE pulse badge */}
                  <div className={cn(
                    "absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all duration-300",
                    isStreaming
                      ? "bg-cyan-400/20 border-cyan-400/40 text-cyan-300 animate-live-pulse"
                      : messages.length > 0
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                      : "bg-white/5 border-white/10 text-muted-foreground/60"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isStreaming ? "bg-cyan-400 animate-pulse" : messages.length > 0 ? "bg-emerald-400" : "bg-muted-foreground/40"
                    )} />
                    {isStreaming ? "LIVE" : messages.length > 0 ? "ACTIVE" : "IDLE"}
                  </div>
                </div>
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">{selectedMember.name}</h3>
                <Badge className={cn("text-xs mt-1 mb-3 border-0", colors.badge)}>{selectedMember.title}</Badge>
                <p className="text-xs text-muted-foreground leading-relaxed">{selectedMember.description}</p>
              </div>

              <div className="p-4 border-b border-white/5 space-y-2">
                <Button
                  onClick={() => { setMessages([]); setConsultationId(null); setDetectedStatutes([]); setSuggestedCases([]); setDeepDiveMeta(null); setDeepDiveMode(false); }}
                  className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-semibold"
                >
                  <PlusCircle className="w-4 h-4 mr-2" /> New Consultation
                </Button>
                {selectedMember?.id === "case-law-analyst" && (
                  <Button
                    onClick={() => { setDeepDiveMode(d => !d); setDeepDiveInput(""); }}
                    className={cn(
                      "w-full font-semibold border transition-all",
                      deepDiveMode
                        ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30"
                        : "bg-white/5 hover:bg-white/10 text-muted-foreground border-white/10"
                    )}
                  >
                    <GitFork className="w-4 h-4 mr-2" />
                    {deepDiveMode ? "Exit Deep Dive" : "Case Deep Dive"}
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                {/* Deep Dive Meta Panel */}
                {deepDiveMeta && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <GitFork className="w-3 h-3" /> ZimLII Research
                    </h4>

                    {/* ZimLII search link */}
                    <a
                      href={deepDiveMeta.zimliiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors mb-3"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="flex-1 truncate">Search ZimLII for "{deepDiveMeta.query.slice(0, 28)}"</span>
                    </a>

                    {/* Local DB hits */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Database className="w-3 h-3" />
                      <span>{deepDiveMeta.dbHits > 0 ? `${deepDiveMeta.dbHits} match${deepDiveMeta.dbHits > 1 ? "es" : ""} in local database` : "Not in local database"}</span>
                    </div>

                    {deepDiveMeta.dbCases.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {deepDiveMeta.dbCases.map((c, i) => (
                          <div key={i} className="text-xs p-2 rounded-lg bg-white/5 border border-white/5">
                            <p className="text-foreground/90 font-medium">{c.citation}</p>
                            <p className="text-muted-foreground mt-0.5">{c.court} · {c.year ?? "year unknown"}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {deepDiveMeta.dbStatutes.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Related Statutes</p>
                        <div className="space-y-1">
                          {deepDiveMeta.dbStatutes.map((s, i) => (
                            <div key={i} className="text-xs p-2 rounded bg-white/3 border border-white/5 text-foreground/70">
                              {s.title} {s.chapter ? `(${s.chapter})` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ZimLII search results */}
                    {deepDiveMeta.zimliiResults.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3" />
                          ZimLII Documents
                          <span className="ml-1 px-1 rounded bg-purple-500/20 text-purple-300">
                            {deepDiveMeta.zimliiSource === "live" ? "live" : "index"}
                          </span>
                        </p>
                        <div className="space-y-1.5">
                          {deepDiveMeta.zimliiResults.map((r, i) => (
                            <a
                              key={i}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs p-2 rounded-lg bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/15 hover:border-purple-500/30 transition-colors group"
                            >
                              <p className="text-foreground/90 font-medium leading-snug line-clamp-2 group-hover:text-purple-300 transition-colors">
                                {r.title}
                              </p>
                              {(r.citation || r.court) && (
                                <p className="text-muted-foreground mt-0.5">
                                  {r.citation}{r.citation && r.court ? " · " : ""}{r.court}
                                </p>
                              )}
                              {r.date && (
                                <p className="text-muted-foreground/60 text-[10px]">{r.date}</p>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {deepDiveMeta.zimliiHits === 0 && deepDiveMeta.dbHits === 0 && (
                      <p className="text-[11px] text-muted-foreground/60 mt-2 italic">No matches — AI analysis proceeds from training knowledge.</p>
                    )}

                    <Separator className="my-3 opacity-20" />
                  </div>
                )}

                {detectedStatutes.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detected Statutes</h4>
                    <div className="space-y-2">
                      {detectedStatutes.map((s, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-white/5 border border-white/5 text-foreground/80">
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {suggestedCases.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cited Cases</h4>
                    <div className="space-y-2">
                      {suggestedCases.map((c, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-white/5 border border-white/5 text-foreground/80 italic">
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </motion.aside>

            {/* Centre: Chat */}
            <main className="flex-1 flex flex-col relative bg-card/20">
              {/* Mobile back button */}
              <div className="lg:hidden flex items-center gap-3 p-4 border-b border-white/5">
                <Button variant="ghost" size="icon" onClick={() => setSelectedMember(null)}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border", colors.bg, colors.border)}>
                  <ActiveIcon className={cn("w-4 h-4", colors.badge.split(" ")[1])} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedMember.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedMember.title}</p>
                </div>
              </div>

              {/* Deep Dive Search Bar */}
              {deepDiveMode && selectedMember?.id === "case-law-analyst" && (
                <div className="border-b border-purple-500/20 bg-purple-500/5 px-4 py-3">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <GitFork className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-purple-300">Case Deep Dive</span>
                      <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[10px] ml-1">ZimLII Pipeline</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Enter a case name or citation for an 8-step research analysis: identification → facts → ratio → obiter → citation chain → application.
                    </p>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={deepDiveInput}
                          onChange={e => setDeepDiveInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleDeepDive(); }}
                          placeholder="e.g. Kuvarega v Registrar General or 1998 (1) ZLR 188..."
                          disabled={isStreaming}
                          className="w-full bg-card/80 border border-purple-500/30 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/30 disabled:opacity-60"
                        />
                      </div>
                      <Button
                        onClick={handleDeepDive}
                        disabled={!deepDiveInput.trim() || isStreaming}
                        className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 shrink-0"
                      >
                        {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 p-4 sm:p-6 lg:p-8" ref={scrollRef}>
                <div className="max-w-3xl mx-auto space-y-8 pb-40">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center pt-20">
                      <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-6 border", colors.bg, colors.border)}>
                        <ActiveIcon className={cn("w-10 h-10", colors.badge.split(" ")[1])} />
                      </div>
                      <h2 className="text-2xl font-display font-bold mb-2">{selectedMember.name}</h2>
                      <p className="text-muted-foreground max-w-md text-sm">{selectedMember.description}</p>
                      <div className="mt-8 flex flex-wrap gap-2 justify-center">
                        {getSamplePrompts(selectedMember.id).map((p, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            onClick={() => setInput(p)}
                            className="text-xs h-auto py-2 px-3 bg-card/50 border-white/10 hover:border-primary/30 text-muted-foreground hover:text-foreground text-left"
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={cn("flex gap-4 w-full", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                        msg.role === "user"
                          ? "bg-secondary border-white/10"
                          : msg.streaming
                          ? cn(colors.bg, colors.border, "animate-pulse-ring")
                          : cn(colors.bg, colors.border)
                      )}>
                        {msg.role === "user"
                          ? <User className="w-5 h-5 text-foreground/70" />
                          : <ActiveIcon className={cn("w-5 h-5", colors.badge.split(" ")[1])} />
                        }
                      </div>

                      <div className={cn("max-w-[90%]", msg.role === "user" ? "bg-gradient-to-br from-secondary to-secondary/80 px-5 py-4 rounded-2xl rounded-tr-sm border border-white/8 shadow-md" : "")}>
                        {msg.role === "assistant" && (
                          <div
                            className="relative"
                            onMouseEnter={() => !msg.streaming && setHoveredMessageId(msg.id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                          >
                            <AnimatePresence>
                              {hoveredMessageId === msg.id && !msg.streaming && (
                                <MessageHoverToolbar
                                  onCopy={() => { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }}
                                />
                              )}
                            </AnimatePresence>
                            <div
                              className={cn("glass-card rounded-2xl rounded-tl-sm p-6 border-l-4 relative overflow-hidden transition-all duration-300", colors.border.replace("border-", "border-l-"))}
                              style={msg.streaming ? {
                                borderColor: undefined,
                                boxShadow: `0 0 0 1px ${(GLOW_COLORS[selectedMember.color] || GLOW_COLORS.gold).replace("0.4","0.2")}, 0 0 24px ${(GLOW_COLORS[selectedMember.color] || GLOW_COLORS.gold).replace("0.4","0.08")}`
                              } : undefined}
                            >
                              {msg.streaming && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                                  <div
                                    className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                                    style={{ animation: "card-shimmer 2s ease-in-out infinite" }}
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5 text-xs text-muted-foreground">
                                <Brain className="w-3.5 h-3.5 text-cyan-400/70" />
                                <span className="font-medium">{selectedMember.name}</span>
                                <Badge className={cn("text-[10px] border-0 ml-1", colors.badge)}>{selectedMember.title}</Badge>
                                {msg.streaming && (
                                  <span className="flex items-center gap-1.5 ml-auto text-primary">
                                    <span className="flex gap-1">
                                      {[0,1,2].map(i => (
                                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary to-cyan-400 animate-orb-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
                                      ))}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wide">Live</span>
                                  </span>
                                )}
                              </div>

                              {msg.flags && msg.flags.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-2">
                                  {msg.flags.map((flag, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 py-1 text-xs">
                                      <AlertTriangle className="w-3 h-3 mr-1.5" />
                                      [VERIFY: {flag.type.toUpperCase()}]
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="prose prose-invert prose-sm prose-p:leading-relaxed max-w-none">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                {msg.streaming && <StreamingDot />}
                              </div>
                            </div>
                          </div>
                        )}
                        {msg.role === "user" && <p className="leading-relaxed text-sm">{msg.content}</p>}
                      </div>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              {/* Floating Input Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-10">
                <div className="max-w-3xl mx-auto">
                  <div
                    className="relative rounded-2xl border border-white/12 bg-card/80 backdrop-blur-2xl overflow-hidden transition-all duration-300 focus-within:border-primary/40"
                    style={{ boxShadow: "0 0 0 1px rgba(201,168,76,0.08), 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}
                  >
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={`Ask ${selectedMember.name} a legal question...`}
                      disabled={isStreaming}
                      rows={2}
                      className="w-full min-h-[52px] max-h-[180px] bg-transparent p-4 pb-12 pr-4 text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none disabled:opacity-60"
                    />
                    {/* Bottom toolbar */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground/60 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all"
                          title="Voice input"
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Attach file"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/40">Shift+Enter for new line</span>
                        <Button
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded-xl transition-all duration-200",
                            input.trim() && !isStreaming
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_12px_rgba(201,168,76,0.4)]"
                              : "bg-white/5 text-muted-foreground/40 cursor-not-allowed"
                          )}
                          onClick={handleSend}
                          disabled={!input.trim() || isStreaming}
                        >
                          {isStreaming
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function getSamplePrompts(memberId: string): string[] {
  const prompts: Record<string, string[]> = {
    "general-counsel": [
      "What are the elements of a valid contract under Zimbabwe law?",
      "Explain the Prescription Act and how it bars civil claims",
      "What remedies are available for breach of contract?",
    ],
    "document-drafter": [
      "Draft a Notice of Motion for an urgent interdict",
      "Draft a Founding Affidavit for a summary judgment application",
      "Draft a Certificate of Urgency for a chamber application",
    ],
    "case-law-analyst": [
      "Deep dive: Kuvarega v Registrar General",
      "What cases govern the test for urgency in Zimbabwe?",
      "Trace the development of the estoppel principle in Zimbabwe courts",
      "Deep dive: Telecel Zimbabwe v POTRAZ",
    ],
    "procedure-guide": [
      "Walk me through the default judgment procedure step by step",
      "What are the time limits for filing a notice of appeal?",
      "How do I apply for a provisional order in the High Court?",
    ],
    "constitutional-counsel": [
      "How do I enforce fundamental rights under Section 85 of the Constitution?",
      "What is the test for a constitutional declaration of invalidity?",
      "Explain legitimate expectation in Zimbabwean administrative law",
    ],
  };
  return prompts[memberId] || prompts["general-counsel"];
}
