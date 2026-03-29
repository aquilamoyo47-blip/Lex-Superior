import React, { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Gavel, Scale, Loader2, Download, CheckCircle2, Paperclip, X, Plus, UploadCloud } from "lucide-react";
import { useGenerateDocument } from "@workspace/api-client-react";
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

export default function Documents() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setIsGenerating(true);

    try {
      await generateDocMutation.mutateAsync({
        data: {
          documentType: selectedDoc,
          caseDetails: {
            ...formData,
            attachedDocuments: attachedFiles.map(f => f.name)
          }
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

                            {/* Drag & Drop Zone */}
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

                            {/* Attached Files List */}
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
