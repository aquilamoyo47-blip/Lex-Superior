import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FileText, UploadCloud, Search, Star, MoreVertical, Trash2 } from "lucide-react";
import { useListVaultFiles } from "@workspace/api-client-react";

const FOLDERS = ["My Consultations", "Generated Documents", "Court Papers", "Bookmarks"];

type DisplayFile = {
  id: string;
  name: string;
  fileType?: string | null;
  createdAt?: Date | string | null;
  fileSize?: number | null;
};

const MOCK_FILES: DisplayFile[] = [
  { id: "1", name: "Urgent_Chamber_App_Draft.docx", fileType: "docx" },
  { id: "2", name: "High_Court_Rules_Summary.pdf", fileType: "pdf" },
  { id: "3", name: "Kuvarega_Case_Notes.txt", fileType: "txt" },
];

export default function Vault() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListVaultFiles({ search });
  
  const files: DisplayFile[] = data?.files || MOCK_FILES;

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Folders */}
        <aside className="w-64 border-r border-white/5 bg-background/50 p-6 hidden md:block">
          <Button className="w-full mb-8 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
            <UploadCloud className="w-4 h-4 mr-2" /> Upload File
          </Button>
          
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Folders</h4>
          <nav className="space-y-1">
            {FOLDERS.map(folder => (
              <Button key={folder} variant="ghost" className="w-full justify-start font-normal text-muted-foreground hover:text-foreground">
                <Folder className="w-4 h-4 mr-3" /> {folder}
              </Button>
            ))}
          </nav>

          <div className="mt-auto absolute bottom-6 w-52">
            <div className="bg-card/50 rounded-xl p-4 border border-white/5">
              <h4 className="text-sm font-semibold mb-2">Storage</h4>
              <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden mb-2">
                <div className="w-1/4 h-full bg-primary rounded-full"></div>
              </div>
              <p className="text-xs text-muted-foreground">125 MB of 500 MB used</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-display font-bold">All Files</h1>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search files..." className="pl-9 bg-card border-white/10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-card/20 hover:bg-card/40 transition-colors mb-8 cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-1">Drag and drop files here</h3>
            <p className="text-sm text-muted-foreground">PDF, DOCX, TXT up to 50MB</p>
          </div>

          {/* File Grid */}
          <h3 className="font-semibold mb-4 text-muted-foreground">Recent Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map(file => (
              <Card key={file.id} className="glass-card hover:border-primary/30 transition-all group">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-lg bg-secondary">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <Star className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-medium truncate mb-1" title={file.name}>{file.name}</h4>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{file.createdAt ? new Date(file.createdAt as string).toLocaleDateString() : "—"}</span>
                    <span>{file.fileSize ? `${Math.round((file.fileSize as number) / 1024)} KB` : "—"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
