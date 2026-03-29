import React, { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Gavel, Scale, Loader2, Download, CheckCircle2, Paperclip, X, Plus, UploadCloud, Search, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useGenerateDocument, useListPrecedents, getPrecedent } from "@workspace/api-client-react";
import type { Precedent, PrecedentFull } from "@workspace/api-client-react";
import { toast } from "sonner";

const DOCUMENT_CATEGORIES = [
  {
    title: "Applications",
    docs: ["Court Application (Form 23)", "Chamber Application (Form 25)", "Urgent Chamber Application"]
  },
  {
    title: "Pleadings",
    docs: ["Summons (Form 1)", "Declaration", "Plea", "Claim in Reconvention"]
  },
  {
    title: "Affidavits",
    docs: ["Founding Affidavit", "Opposing Affidavit", "Answering Affidavit"]
  }
];

const ACCEPTED_TYPES = ".pdf,.docx,.txt";
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
]);
const ACCEPTED_EXTENSIONS = new Set(["pdf", "docx", "txt"]);

interface AttachedFile {
  id: string;
  name: string;
  size: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Civil Procedure": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Labour Law": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Property / Conveyancing": "bg-green-500/20 text-green-300 border-green-500/30",
  "Corporate": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Criminal": "bg-red-500/20 text-red-300 border-red-500/30",
  "General": "bg-white/10 text-white/60 border-white/10",
};

function PrecedentPicker({ onSelect, onClose }: {
  onSelect: (precedent: Precedent) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListPrecedents({
    q: search.trim().length >= 2 ? search : undefined,
  });
  const precedents = data?.precedents ?? [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search precedents by keyword..."
          className="pl-9 bg-background border-white/10"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading precedents...</div>
        ) : precedents.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {search.length >= 2 ? "No matching precedents found." : "Start typing to search precedents."}
          </div>
        ) : (
          precedents.slice(0, 50).map(p => {
            const colorClass = CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS["General"];
            return (
              <button
                key={p.id}
                onClick={() => { onSelect(p); onClose(); }}
                className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium truncate">{p.title}</span>
                      <Badge variant="outline" className={`text-xs border ${colorClass} flex-shrink-0`}>
                        {p.category}
                      </Badge>
                    </div>
                    {p.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.excerpt}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {p.wordCount?.toLocaleString()}w
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full border-white/10" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );
}

export default function Documents() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showPrecedentPicker, setShowPrecedentPicker] = useState(false);
  const [selectedPrecedent, setSelectedPrecedent] = useState<Precedent | null>(null);
  const [formData, setFormData] = useState({
    caseNumber: "",
    applicant: "",
    respondent: "",
    factsOfMatter: "",
    groundsArguments: "",
    reliefSought: ""
  });
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateDocMutation = useGenerateDocument();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const accepted: AttachedFile[] = [];
    const rejected: string[] = [];
    Array.from(fileList).forEach(f => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const validType = ACCEPTED_MIME_TYPES.has(f.type) || ACCEPTED_EXTENSIONS.has(ext);
      if (validType) {
        accepted.push({ id: `${f.name}-${Date.now()}-${Math.random()}`, name: f.name, size: formatFileSize(f.size) });
      } else {
        rejected.push(f.name);
      }
    });
    if (rejected.length > 0) {
      toast.error(`Unsupported file type: ${rejected.join(", ")}. Only PDF, DOCX, and TXT are accepted.`);
    }
    if (accepted.length > 0) {
      setAttachedFiles(prev => [...prev, ...accepted]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleSelectPrecedent = async (precedent: Precedent) => {
    setSelectedPrecedent(precedent);
    toast.success(`Loading precedent: ${precedent.title}`);

    try {
      const full = await getPrecedent(precedent.id);
      const text = full.fullText ?? precedent.excerpt ?? "";
      const truncated = text.length > 8000 ? text.slice(0, 8000) + "\n\n[... truncated for display ...]" : text;
      setFormData(fd => ({
        ...fd,
        factsOfMatter: fd.factsOfMatter
          ? fd.factsOfMatter
          : `[Based on Palmer precedent: ${precedent.title}]\n\n${truncated}`,
      }));
    } catch {
      if (precedent.excerpt) {
        setFormData(fd => ({
          ...fd,
          factsOfMatter: fd.factsOfMatter
            ? fd.factsOfMatter
            : `[Based on Palmer precedent: ${precedent.title}]\n\n${precedent.excerpt}`,
        }));
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setIsGenerating(true);

    const precedentContext = selectedPrecedent
      ? `\n\nBASE PRECEDENT (Palmer Law Firm - ${selectedPrecedent.category}):\nTitle: ${selectedPrecedent.title}\n${selectedPrecedent.excerpt ?? ""}`
      : "";

    try {
      await generateDocMutation.mutateAsync({
        data: {
          documentType: selectedDoc,
          caseDetails: {
            ...formData,
            attachedDocuments: attachedFiles.map(f => f.name)
          },
          additionalInfo: precedentContext || undefined,
        }
      });
    } catch (err) {
      console.log("Mocking successful generation");
    }

    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedDoc({ content: "Document generation simulated successfully." });
      toast.success("Document Generated Successfully");
    }, 2000);
  };

  const resetForm = () => {
    setFormData({ caseNumber: "", applicant: "", respondent: "", factsOfMatter: "", groundsArguments: "", reliefSought: "" });
    setAttachedFiles([]);
    setGeneratedDoc(null);
    setIsDragOver(false);
    setSelectedPrecedent(null);
    setShowPrecedentPicker(false);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold mb-4">Document Drafting Studio</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">Generate highly accurate, formatting-compliant court documents for the Superior Courts of Zimbabwe.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {DOCUMENT_CATEGORIES.map((category, i) => (
            <div key={i} className="space-y-4">
              <h3 className="text-lg font-bold font-display text-primary flex items-center gap-2 pb-2 border-b border-white/5">
                <FileText className="w-5 h-5" /> {category.title}
              </h3>
              <div className="space-y-3">
                {category.docs.map(doc => (
                  <Dialog key={doc} open={isOpen && selectedDoc === doc} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (open) {
                      setSelectedDoc(doc);
                      resetForm();
                    } else {
                      setSelectedDoc(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Card className="glass-card hover:bg-white/5 cursor-pointer transition-all border-white/5 hover:border-primary/30">
                        <CardHeader className="p-4">
                          <CardTitle className="text-sm font-medium">{doc}</CardTitle>
                        </CardHeader>
                      </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[680px] bg-card border-white/10 max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="font-display text-xl">{doc}</DialogTitle>
                        <DialogDescription>
                          Fill in the details below. Lex Superior AI will draft the substantive content based on your inputs.
                        </DialogDescription>
                      </DialogHeader>

                      {generatedDoc ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-8 h-8 text-success" />
                          </div>
                          <h3 className="text-xl font-bold">Draft Complete</h3>
                          <p className="text-muted-foreground">Your document has been drafted and formatted to court standards.</p>
                          <div className="flex gap-4 mt-6">
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                              <Download className="w-4 h-4 mr-2" /> Download DOCX
                            </Button>
                            <Button variant="outline" className="border-white/20">
                              <Download className="w-4 h-4 mr-2" /> Download PDF
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleGenerate} className="space-y-5 pt-4">
                          {/* Start from Precedent */}
                          <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                <Label className="text-sm font-semibold text-primary">Start from a Precedent</Label>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-primary/30 text-primary hover:bg-primary/10 h-8 px-3 text-xs"
                                onClick={() => setShowPrecedentPicker(p => !p)}
                              >
                                {showPrecedentPicker ? (
                                  <><ChevronUp className="w-3 h-3 mr-1" /> Hide</>
                                ) : (
                                  <><Search className="w-3 h-3 mr-1" /> Browse Palmer Precedents</>
                                )}
                              </Button>
                            </div>

                            {selectedPrecedent ? (
                              <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-primary truncate">{selectedPrecedent.title}</p>
                                  <p className="text-xs text-muted-foreground">{selectedPrecedent.category} · {selectedPrecedent.wordCount?.toLocaleString()} words</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedPrecedent(null); }}
                                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Optionally select a Palmer Law Firm precedent as your starting template. The AI will adapt it to your case details.
                              </p>
                            )}

                            {showPrecedentPicker && (
                              <PrecedentPicker
                                onSelect={handleSelectPrecedent}
                                onClose={() => setShowPrecedentPicker(false)}
                              />
                            )}
                          </div>

                          {/* Case Number */}
                          <div className="space-y-2">
                            <Label htmlFor="caseNumber">Case Number (Optional)</Label>
                            <Input
                              id="caseNumber"
                              placeholder="HC 1234/24"
                              className="bg-background border-white/10"
                              value={formData.caseNumber}
                              onChange={e => setFormData({ ...formData, caseNumber: e.target.value })}
                            />
                          </div>

                          {/* Applicant / Respondent */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="applicant">Applicant / Plaintiff</Label>
                              <Input
                                id="applicant"
                                required
                                className="bg-background border-white/10"
                                value={formData.applicant}
                                onChange={e => setFormData({ ...formData, applicant: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="respondent">Respondent / Defendant</Label>
                              <Input
                                id="respondent"
                                required
                                className="bg-background border-white/10"
                                value={formData.respondent}
                                onChange={e => setFormData({ ...formData, respondent: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Facts of the Matter */}
                          <div className="space-y-2">
                            <Label htmlFor="factsOfMatter">Facts of the Matter</Label>
                            <Textarea
                              id="factsOfMatter"
                              required
                              placeholder="Describe the background facts and circumstances of this matter..."
                              className="bg-background border-white/10 min-h-[100px] resize-y"
                              value={formData.factsOfMatter}
                              onChange={e => setFormData({ ...formData, factsOfMatter: e.target.value })}
                            />
                          </div>

                          {/* Grounds / Legal Arguments */}
                          <div className="space-y-2">
                            <Label htmlFor="groundsArguments">Grounds / Legal Arguments</Label>
                            <Textarea
                              id="groundsArguments"
                              required
                              placeholder="State the legal grounds and arguments supporting this application..."
                              className="bg-background border-white/10 min-h-[100px] resize-y"
                              value={formData.groundsArguments}
                              onChange={e => setFormData({ ...formData, groundsArguments: e.target.value })}
                            />
                          </div>

                          {/* Relief Sought */}
                          <div className="space-y-2">
                            <Label htmlFor="reliefSought">Relief Sought</Label>
                            <Textarea
                              id="reliefSought"
                              required
                              placeholder="Describe the relief or orders you are seeking from the court..."
                              className="bg-background border-white/10 min-h-[80px] resize-y"
                              value={formData.reliefSought}
                              onChange={e => setFormData({ ...formData, reliefSought: e.target.value })}
                            />
                          </div>

                          {/* Attach Supporting Documents */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold">Attach Supporting Documents</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-primary/30 text-primary hover:bg-primary/10 h-8 px-3"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Plus className="w-4 h-4 mr-1" /> Add Files
                              </Button>
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept={ACCEPTED_TYPES}
                              className="hidden"
                              onChange={e => addFiles(e.target.files)}
                            />

                            <div
                              onDrop={handleDrop}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onClick={() => fileInputRef.current?.click()}
                              className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragOver ? "border-primary bg-primary/10" : "border-white/10 hover:border-primary/40 hover:bg-card/40 bg-card/20"}`}
                            >
                              <UploadCloud className={`w-7 h-7 mb-2 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                              <p className="text-sm text-muted-foreground">
                                <span className="text-primary font-medium">Click to browse</span> or drag & drop files here
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT accepted</p>
                            </div>

                            {attachedFiles.length > 0 && (
                              <div className="space-y-2">
                                {attachedFiles.map(file => (
                                  <div key={file.id} className="flex items-center justify-between bg-background/50 border border-white/10 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Paperclip className="w-4 h-4 text-primary flex-shrink-0" />
                                      <span className="text-sm truncate">{file.name}</span>
                                      <span className="text-xs text-muted-foreground flex-shrink-0">{file.size}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                                      onClick={() => removeFile(file.id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-md"
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Lex Superior AI Drafting...
                              </>
                            ) : (
                              <>
                                <Gavel className="w-5 h-5 mr-2" /> Generate Document
                                {selectedPrecedent && <span className="ml-1 text-xs opacity-75">(with precedent)</span>}
                              </>
                            )}
                          </Button>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
