import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Send, Scale, Copy, Download, Bookmark, AlertTriangle, FileText, Bot, User, Brain, Search, PlusCircle, CheckCircle2, CircleDashed, MessageSquare, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSendMessage, useListConsultations, useCreateConsultation } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Mock data to enable UI demonstration while APIs might fail
const MOCK_MESSAGES = [
  {
    id: "1",
    role: "user",
    content: "What are the requirements for an urgent chamber application under the new High Court Rules?",
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    role: "assistant",
    content: "Under the High Court Rules, SI 202 of 2021, the requirements for an urgent chamber application are strictly construed.\n\n### 1. The Rule\nRule 60 regulates urgent chamber applications. A legal practitioner must certify that the matter is urgent.\n\n### 2. The Test for Urgency\nThe classic test for urgency was laid down in *Kuvarega v Registrar General* 1998 (1) ZLR 188. A matter is urgent if at the time the need to act arises, the matter cannot wait to be resolved through the ordinary procedural motion roll.\n\n### 3. Requirements\n- **Form 25**: The application must be in Form 25.\n- **Founding Affidavit**: Must establish the cause of action and explicitly detail why the matter is urgent.\n- **Certificate of Urgency**: Drafted by a legal practitioner.\n- **Draft Order**: Specifying the interim relief sought.\n\nPlease note the 48-hour requirement for setting down if opposed.",
    providerUsed: "SambaNova (DeepSeek R1)",
    fromCache: true,
    flags: [],
    thinkingChain: "Analyzing query -> Identifying Rule 60 SI 202/2021 -> Recalling Kuvarega test -> Structuring response.",
    detectedStatutes: ["High Court Rules SI 202 of 2021, Rule 60"],
    suggestedCases: ["Kuvarega v Registrar General 1998 (1) ZLR 188", "Document Support Centre v Mapuvire 2006"],
    createdAt: new Date().toISOString()
  }
];

const PRACTICE_AREAS = [
  "All", "Contract", "Property", "Procedure", "Constitutional", "Administrative", "Family", "Insolvency", "Labour"
];

export default function Chat() {
  const [input, setInput] = useState("");
  const [practiceArea, setPracticeArea] = useState("Procedure");
  const [messages, setMessages] = useState<any[]>(MOCK_MESSAGES);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      // Allow mutation to fail silently and fallback to mock response for UI completeness
      const response = await sendMessageMutation.mutateAsync({
        data: {
          message: userMsg.content,
          practiceArea: practiceArea as any
        }
      });
      
      setMessages(prev => [...prev, { ...response, role: "assistant" }]);
    } catch (error) {
      console.error("API Error, using fallback response", error);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: `This is a simulated response indicating a missing backend endpoint. You asked about: "${userMsg.content}". In a production environment, this would be processed by DeepSeek R1 via SambaNova.\n\n### Applicable Law\nPlease refer to the relevant Chapter of the Laws of Zimbabwe.`,
          providerUsed: "Fallback Mock",
          fromCache: false,
          flags: [{ type: "authority", text: "Simulated response" }],
          createdAt: new Date().toISOString()
        }]);
        setIsProcessing(false);
      }, 2000);
      return;
    }
    setIsProcessing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <AppLayout>
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-80px)]">
        {/* Left Sidebar - History */}
        <aside className="w-72 border-r border-white/5 bg-background/50 flex-col hidden lg:flex">
          <div className="p-4 border-b border-white/5">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
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
            <div className="px-4 py-2 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today</h4>
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start text-sm font-normal h-auto py-2 bg-white/5">
                    <MessageSquare className="w-4 h-4 mr-2 text-primary shrink-0" />
                    <span className="truncate">Urgent Chamber App Req...</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm font-normal h-auto py-2 text-muted-foreground hover:text-foreground">
                    <MessageSquare className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">Rule 30 Summary Judgm...</span>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col relative bg-card/20">
          <ScrollArea className="flex-1 p-4 sm:p-6 lg:p-8" ref={scrollRef}>
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center mt-32">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                    <Scale className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Lex Superior AI Assistant</h2>
                  <p className="text-muted-foreground max-w-md">Describe your legal matter, ask for procedural guidance, or request document drafting.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex gap-4 w-full",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                      msg.role === "user" ? "bg-secondary border-white/10" : "bg-primary/10 border-primary/30"
                    )}>
                      {msg.role === "user" ? <User className="w-5 h-5 text-foreground/70" /> : <Scale className="w-5 h-5 text-primary" />}
                    </div>
                    
                    <div className={cn(
                      "max-w-[85%]",
                      msg.role === "user" ? "bg-secondary text-foreground px-5 py-4 rounded-2xl rounded-tr-sm border border-white/5" : ""
                    )}>
                      {msg.role === "assistant" && (
                        <div className="glass-card rounded-2xl rounded-tl-sm p-6 border-l-4 border-l-primary relative overflow-hidden">
                          {/* Metadata header */}
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> {msg.providerUsed}</span>
                            {msg.fromCache && <Badge variant="secondary" className="text-[10px] bg-white/5 border-white/10">CACHED</Badge>}
                          </div>
                          
                          {/* Thinking chain (optional) */}
                          {msg.thinkingChain && (
                            <details className="mb-4 group">
                              <summary className="text-xs font-semibold text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-primary transition-colors">
                                <Bot className="w-3.5 h-3.5" /> View Analysis Chain
                              </summary>
                              <div className="mt-2 p-3 bg-black/20 rounded-lg text-xs font-mono text-muted-foreground border border-white/5 leading-relaxed">
                                {msg.thinkingChain}
                              </div>
                            </details>
                          )}

                          {/* Flags */}
                          {msg.flags?.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                              {msg.flags.map((flag: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 py-1">
                                  <AlertTriangle className="w-3 h-3 mr-1.5" />
                                  [VERIFY: {flag.type.toUpperCase()}] {flag.text}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Content */}
                          <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>

                          {/* Actions */}
                          <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(msg.content)} className="h-8 text-muted-foreground hover:text-foreground">
                              <Copy className="w-4 h-4 mr-1.5" /> Copy
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                              <Download className="w-4 h-4 mr-1.5" /> PDF
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground ml-auto">
                              <Bookmark className="w-4 h-4 mr-1.5" /> Save to Vault
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {msg.role === "user" && (
                        <p className="leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isProcessing && (
                <div className="flex gap-4 w-full">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10 border border-primary/30">
                    <Scale className="w-5 h-5 text-primary" />
                  </div>
                  <Card className="glass-card p-5 max-w-sm w-full">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Scale className="w-4 h-4 text-primary" /> Processing Legal Matter...
                      </h4>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-3 text-success">
                          <CheckCircle2 className="w-4 h-4" /> Context loaded
                        </div>
                        <div className="flex items-center gap-3 text-primary">
                          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /> DeepSeek R1 analysing
                        </div>
                        <div className="flex items-center gap-3 opacity-50">
                          <CircleDashed className="w-4 h-4" /> Quality review pending
                        </div>
                        <div className="flex items-center gap-3 opacity-50">
                          <CircleDashed className="w-4 h-4" /> Formatting
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
            <div className="max-w-4xl mx-auto">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {PRACTICE_AREAS.map(area => (
                  <Badge 
                    key={area} 
                    variant={practiceArea === area ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-colors",
                      practiceArea === area ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-white/5 bg-background/50 backdrop-blur-md"
                    )}
                    onClick={() => setPracticeArea(area)}
                  >
                    {area}
                  </Badge>
                ))}
              </div>
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
                  placeholder="Describe your legal matter or request a document..."
                  className="w-full min-h-[60px] max-h-[200px] bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 pr-14 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none transition-all shadow-lg shadow-black/10"
                  rows={2}
                />
                <Button 
                  size="icon" 
                  className="absolute right-3 bottom-3 h-9 w-9 bg-primary hover:bg-primary/90 rounded-xl"
                  onClick={handleSend}
                  disabled={!input.trim() || isProcessing}
                >
                  <Send className="w-4 h-4 text-primary-foreground" />
                </Button>
              </div>
              <div className="flex justify-between items-center mt-2 px-2">
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 cursor-pointer text-xs font-normal border-white/5">Draft Pleading</Badge>
                  <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 cursor-pointer text-xs font-normal border-white/5 hidden sm:inline-flex">Legal Opinion</Badge>
                </div>
                <span className="text-xs text-muted-foreground font-medium">Use Shift + Enter for new line</span>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Context (Hidden on small screens) */}
        <aside className="w-80 border-l border-white/5 bg-background/50 flex-col hidden xl:flex">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Active Context
            </h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detected Statutes</h4>
                <div className="space-y-2">
                  <Card className="p-3 bg-card/50 border-white/5 hover:border-primary/30 transition-colors cursor-pointer group">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">High Court Rules, 2021</p>
                    <p className="text-xs text-muted-foreground mt-1">Rule 60 - Urgent Applications</p>
                  </Card>
                </div>
              </div>
              
              <Separator className="bg-white/5" />
              
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Suggested Authorities</h4>
                <div className="space-y-2">
                  <Card className="p-3 bg-card/50 border-white/5 hover:border-primary/30 transition-colors cursor-pointer group">
                    <p className="text-sm font-medium text-foreground italic group-hover:text-primary transition-colors">Kuvarega v Registrar General</p>
                    <p className="text-xs text-muted-foreground mt-1">1998 (1) ZLR 188</p>
                  </Card>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </AppLayout>
  );
}
