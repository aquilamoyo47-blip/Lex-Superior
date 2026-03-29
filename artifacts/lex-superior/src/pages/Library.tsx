import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Book, Scale, FileText, BookmarkPlus, ExternalLink } from "lucide-react";
import { useListStatutes } from "@workspace/api-client-react";

const MOCK_STATUTES = [
  { title: "High Court Act", chapter: "Chapter 7:06", tags: ["Procedure", "Jurisdiction"] },
  { title: "Deeds Registries Act", chapter: "Chapter 20:05", tags: ["Property", "Conveyancing"] },
  { title: "Prescription Act", chapter: "Chapter 8:11", tags: ["Civil", "Time Limits"] }
];

export default function Library() {
  const [search, setSearch] = useState("");
  
  // Real hook ready for backend integration
  const { data: statutesData, isLoading } = useListStatutes({ search });

  const statutesToDisplay = statutesData?.statutes || MOCK_STATUTES;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">Legal Library</h1>
            <p className="text-muted-foreground">Comprehensive, searchable database of Zimbabwean Civil Law.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search statutes, cases, rules..." 
              className="pl-10 h-12 bg-card/50 border-white/10 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="statutes" className="w-full">
          <TabsList className="bg-card/50 border border-white/5 p-1 mb-8 flex flex-wrap h-auto w-full justify-start rounded-xl">
            <TabsTrigger value="statutes" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Statutes</TabsTrigger>
            <TabsTrigger value="rules" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Court Rules</TabsTrigger>
            <TabsTrigger value="cases" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Case Law</TabsTrigger>
            <TabsTrigger value="principles" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Principles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="statutes" className="space-y-4">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">Loading library content...</div>
            ) : (
              statutesToDisplay.map((statute, i) => (
                <Card key={i} className="glass-card hover:border-primary/30 transition-colors group">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Book className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold font-display">{statute.title}</h3>
                        <span className="text-sm text-muted-foreground">{statute.chapter}</span>
                      </div>
                      <div className="flex gap-2">
                        {(statute.tags ?? []).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="bg-white/5 border-white/10">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <BookmarkPlus className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rules" className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-card/20">
            <p className="text-muted-foreground flex items-center gap-2">
              <Scale className="w-5 h-5" /> Select Court Rules tab content
            </p>
          </TabsContent>
          <TabsContent value="cases" className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-card/20">
            <p className="text-muted-foreground flex items-center gap-2">
              <Scale className="w-5 h-5" /> Case Law Search Interface
            </p>
          </TabsContent>
          <TabsContent value="principles" className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-card/20">
            <p className="text-muted-foreground flex items-center gap-2">
              <FileText className="w-5 h-5" /> Civil Procedure Notes
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button size="lg" className="rounded-full h-16 px-6 bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:-translate-y-1 transition-all">
          <Scale className="w-5 h-5 mr-2" /> Ask Lex Superior AI
        </Button>
      </div>
    </AppLayout>
  );
}
