import React, { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Send, Scale, Copy, Download, Bookmark, AlertTriangle, Bot, User, Brain, Search, PlusCircle, CheckCircle2, CircleDashed, MessageSquare, BookOpen, Zap, Paperclip, Mic, MicOff, X, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PRACTICE_AREAS = [
  "All", "Contract", "Property", "Procedure", "Constitutional", "Administrative", "Family", "Insolvency", "Labour"
];

interface AttachmentInfo {
  name: string;
  mimeType: string;
  base64: string;
  size: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  providerUsed?: string;
  fromCache?: boolean;
  flags?: Array<{ type: string; text: string }>;
  detectedStatutes?: string[];
  suggestedCases?: string[];
  createdAt: string;
  streaming?: boolean;
  attachmentName?: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [practiceArea, setPracticeArea] = useState("Procedure");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [activeStatutes, setActiveStatutes] = useState<string[]>([]);
  const [activeCases, setActiveCases] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<AttachmentInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechAPI) {
      setSpeechSupported(true);
      const recognition = new SpeechAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-ZA";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join("");
        setInput(transcript);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        if (event.error !== "aborted") {
          toast.error("Microphone error: " + event.error);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recognition", err);
        toast.error("Could not start microphone.");
      }
    }
  }, [isRecording]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExts = [".pdf", ".docx"];
    const lowerName = file.name.toLowerCase();
    const validType = allowed.includes(file.type) || allowedExts.some((ext) => lowerName.endsWith(ext));

    if (!validType) {
      toast.error("Only PDF and DOCX files are supported.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      setAttachment({
        name: file.name,
        mimeType: file.type || (lowerName.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        base64,
        size: file.size,
      });
    };
    reader.onerror = () => toast.error("Failed to read file.");
    reader.readAsDataURL(file);

    e.target.value = "";
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      attachmentName: attachment?.name,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    const sentInput = input;
    const sentAttachment = attachment;
    setInput("");
    setAttachment(null);
    setIsProcessing(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      providerUsed: "Replit AI",
      fromCache: false,
      flags: [],
      streaming: true,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

      const body: Record<string, unknown> = {
        message: sentInput,
        practiceArea,
        consultationId,
      };

      if (sentAttachment) {
        body.attachment = {
          name: sentAttachment.name,
          mimeType: sentAttachment.mimeType,
          base64: sentAttachment.base64,
        };
      }

      const response = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
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
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          let event: any;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (event.consultationId && !consultationId) {
            setConsultationId(event.consultationId);
          }

          if (event.content) {
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: m.content + event.content }
                : m
            ));
          }

          if (event.done) {
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId
                ? {
                  ...m,
                  id: event.id || m.id,
                  providerUsed: event.providerUsed || m.providerUsed,
                  fromCache: event.fromCache ?? m.fromCache,
                  flags: event.flags || m.flags,
                  detectedStatutes: event.detectedStatutes,
                  suggestedCases: event.suggestedCases,
                  streaming: false,
                }
                : m
            ));
            if (event.detectedStatutes?.length) setActiveStatutes(event.detectedStatutes);
            if (event.suggestedCases?.length) setActiveCases(event.suggestedCases);
          }

          if (event.error) {
            throw new Error(event.error);
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Chat error", error);
      toast.error("Failed to get a response. Please try again.");
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, content: "An error occurred. Please try again.", streaming: false }
          : m
      ));
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <AppLayout>
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-background/50 flex-col hidden lg:flex">
          <div className="p-4 border-b border-white/5">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={() => {
                setMessages([]);
                setConsultationId(null);
                setActiveStatutes([]);
                setActiveCases([]);
                setAttachment(null);
              }}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              New Consultation
            </Button>
          </div>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search history..." className="pl-9 bg-card border-white/10" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-4 py-2">
              <p className="text-xs text-muted-foreground">No previous consultations.</p>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col relative bg-card/20">
          <ScrollArea className="flex-1 p-4 sm:p-6 lg:p-8" ref={scrollRef}>
            <div className="max-w-4xl mx-auto space-y-8 pb-40">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center mt-28">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
                    <Scale className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Lex Superior AI Assistant</h2>
                  <p className="text-muted-foreground max-w-md">Describe your legal matter, ask for procedural guidance, or request document drafting. You can attach a PDF or DOCX, or use the microphone to speak your query.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id || i} className={cn(
                    "flex gap-3 w-full",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border",
                      msg.role === "user" ? "bg-secondary border-white/10" : "bg-primary/10 border-primary/30"
                    )}>
                      {msg.role === "user" ? <User className="w-4 h-4 text-foreground/70" /> : <Scale className="w-4 h-4 text-primary" />}
                    </div>

                    <div className={cn(
                      "max-w-[85%]",
                      msg.role === "user" ? "bg-secondary text-foreground px-4 py-3 rounded-2xl rounded-tr-sm border border-white/5" : ""
                    )}>
                      {msg.role === "assistant" && (
                        <div className="glass-card rounded-2xl rounded-tl-sm p-5 border-l-2 border-l-primary relative overflow-hidden">
                          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Brain className="w-3 h-3" />
                              {msg.providerUsed || "Replit AI"}
                            </span>
                            {msg.fromCache && <Badge variant="secondary" className="text-[10px] bg-white/5 border-white/10">CACHED</Badge>}
                            {msg.streaming && (
                              <span className="flex items-center gap-1 text-primary">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                Generating...
                              </span>
                            )}
                          </div>

                          {msg.flags && msg.flags.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {msg.flags.map((flag: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 py-0.5 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  [VERIFY: {flag.type.toUpperCase()}]
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 max-w-none">
                            <ReactMarkdown>{msg.content || (msg.streaming ? "\u200B" : "")}</ReactMarkdown>
                          </div>

                          {!msg.streaming && (
                            <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(msg.content)} className="h-7 text-muted-foreground hover:text-foreground text-xs">
                                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-foreground text-xs">
                                <Download className="w-3.5 h-3.5 mr-1" /> PDF
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-foreground text-xs ml-auto">
                                <Bookmark className="w-3.5 h-3.5 mr-1" /> Save
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.role === "user" && (
                        <div>
                          {msg.attachmentName && (
                            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground">
                              <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                              <span className="truncate max-w-[200px]">{msg.attachmentName}</span>
                            </div>
                          )}
                          <p className="leading-relaxed text-sm">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isProcessing && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-primary/10 border border-primary/30">
                    <Scale className="w-4 h-4 text-primary" />
                  </div>
                  <Card className="glass-card p-4 max-w-xs w-full">
                    <div className="space-y-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Context loaded
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        Analysing legal matter...
                      </div>
                      <div className="flex items-center gap-2 opacity-40">
                        <CircleDashed className="w-3.5 h-3.5" /> Formatting response
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-8">
              <div className="max-w-3xl mx-auto">
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {PRACTICE_AREAS.map(area => (
                    <Badge
                      key={area}
                      variant={practiceArea === area ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors shrink-0 text-xs",
                        practiceArea === area
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:bg-white/5 bg-background/50 backdrop-blur-md border-white/10"
                      )}
                      onClick={() => setPracticeArea(area)}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>

                {/* Attachment chip */}
                {attachment && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground/80 font-medium truncate max-w-[300px]">{attachment.name}</span>
                    <span className="text-muted-foreground text-xs ml-1">({(attachment.size / 1024).toFixed(0)} KB)</span>
                    <button
                      onClick={() => setAttachment(null)}
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="relative group">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={isRecording ? "Listening... speak now" : "Describe your legal matter or request a document..."}
                    className={cn(
                      "w-full min-h-[60px] max-h-[200px] bg-card/80 backdrop-blur-xl border rounded-2xl p-4 pr-28 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 resize-none transition-all shadow-lg shadow-black/10",
                      isRecording
                        ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/50 placeholder:text-red-400/70"
                        : "border-white/10 focus:border-primary/50 focus:ring-primary/50"
                    )}
                    rows={2}
                  />

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* Action buttons inside textarea */}
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    {/* Upload button */}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors",
                        attachment && "text-primary hover:text-primary"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach PDF or DOCX"
                      disabled={isProcessing}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>

                    {/* Microphone button */}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "h-8 w-8 rounded-lg transition-colors",
                        isRecording
                          ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 animate-pulse"
                          : speechSupported
                          ? "text-muted-foreground hover:text-foreground hover:bg-white/10"
                          : "text-muted-foreground/30 cursor-not-allowed"
                      )}
                      onClick={speechSupported ? toggleRecording : undefined}
                      title={
                        !speechSupported
                          ? "Voice input is not supported in this browser"
                          : isRecording
                          ? "Stop recording"
                          : "Start voice input"
                      }
                      disabled={isProcessing || !speechSupported}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>

                    {/* Send button */}
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-primary hover:bg-primary/90 rounded-xl"
                      onClick={handleSend}
                      disabled={!input.trim() || isProcessing}
                    >
                      <Send className="w-3.5 h-3.5 text-primary-foreground" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 px-2">
                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 cursor-pointer text-xs font-normal border-white/5">Draft Pleading</Badge>
                    <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 cursor-pointer text-xs font-normal border-white/5 hidden sm:inline-flex">Legal Opinion</Badge>
                    {speechSupported && (
                      <span className="text-xs text-muted-foreground/60 hidden sm:inline">· Mic available</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Shift + Enter for new line</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Context */}
        <aside className="w-72 border-l border-white/5 bg-background/50 flex-col hidden xl:flex">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-primary" /> Active Context
            </h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detected Statutes</h4>
                {activeStatutes.length > 0 ? (
                  <div className="space-y-2">
                    {activeStatutes.map((s, i) => (
                      <Card key={i} className="p-3 bg-card/50 border-white/5 hover:border-primary/30 transition-colors">
                        <p className="text-xs font-medium text-foreground">{s}</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No statutes detected yet.</p>
                )}
              </div>

              <Separator className="bg-white/5" />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Suggested Authorities</h4>
                {activeCases.length > 0 ? (
                  <div className="space-y-2">
                    {activeCases.map((c, i) => (
                      <Card key={i} className="p-3 bg-card/50 border-white/5 hover:border-primary/30 transition-colors">
                        <p className="text-xs font-medium text-foreground italic">{c}</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No case authorities detected yet.</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </AppLayout>
  );
}
