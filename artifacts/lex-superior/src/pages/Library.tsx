import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Book, Scale, FileText, BookmarkPlus, ExternalLink, Gavel, FileType, ChevronDown } from "lucide-react";
import { useListStatutes, useListPrecedents } from "@workspace/api-client-react";
import type { Precedent } from "@workspace/api-client-react";

const MOCK_STATUTES = [
  { title: "High Court Act", chapter: "Chapter 7:06", tags: ["Procedure", "Jurisdiction"] },
  { title: "Deeds Registries Act", chapter: "Chapter 20:05", tags: ["Property", "Conveyancing"] },
  { title: "Prescription Act", chapter: "Chapter 8:11", tags: ["Civil", "Time Limits"] }
];

const PRECEDENT_CATEGORIES = [
  "All",
  "Civil Procedure",
  "Labour Law",
  "Property / Conveyancing",
  "Corporate",
  "Criminal",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Civil Procedure": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Labour Law": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Property / Conveyancing": "bg-green-500/20 text-green-300 border-green-500/30",
  "Corporate": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Criminal": "bg-red-500/20 text-red-300 border-red-500/30",
  "General": "bg-white/10 text-white/60 border-white/10",
};

function PrecedentCard({ precedent }: { precedent: Precedent }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = CATEGORY_COLORS[precedent.category] ?? CATEGORY_COLORS["General"];

  return (
    <Card className="glass-card hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Gavel className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="text-base font-semibold font-display truncate">{precedent.title}</h3>
              <Badge
                variant="outline"
                className={`text-xs border ${colorClass} flex-shrink-0`}
              >
                {precedent.category}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                {precedent.wordCount?.toLocaleString()} words · {precedent.fileType?.toUpperCase()}
              </span>
            </div>

            {precedent.excerpt && (
              <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
                {precedent.excerpt}
              </p>
            )}

            {precedent.excerpt && precedent.excerpt.length > 200 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
              >
                {expanded ? "Show less" : "Show more"}
                <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            Source: {precedent.source}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary">
              <BookmarkPlus className="w-3 h-3 mr-1" /> Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Library() {
  const [search, setSearch] = useState("");
  const [precedentSearch, setPrecedentSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: statutesData, isLoading } = useListStatutes({ search });
  const { data: precedentsData, isLoading: loadingPrecedents } = useListPrecedents({
    q: precedentSearch.trim().length >= 2 ? precedentSearch : undefined,
    category: selectedCategory !== "All" ? selectedCategory : undefined,
  });

  const statutesToDisplay = statutesData?.statutes || MOCK_STATUTES;
  const precedents = precedentsData?.precedents ?? [];

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
            <TabsTrigger value="precedents" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Precedents
              {precedentsData?.total != null && (
                <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary text-xs">
                  {precedentsData.total}
                </Badge>
              )}
            </TabsTrigger>
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

          <TabsContent value="precedents" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-primary" /> Palmer Law Firm Precedents
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {precedentsData?.total ?? "…"} authentic Zimbabwean legal documents — real precedents from practice.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search precedents..."
                  className="pl-9 h-10 bg-card/50 border-white/10 rounded-xl text-sm"
                  value={precedentSearch}
                  onChange={(e) => setPrecedentSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRECEDENT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white/5 text-muted-foreground border-white/10 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {loadingPrecedents ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                <FileType className="w-5 h-5 mr-2 animate-pulse" /> Loading precedents...
              </div>
            ) : precedents.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Gavel className="w-8 h-8 opacity-40" />
                <p>No precedents found. Try a different search or category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {precedents.map(p => (
                  <PrecedentCard key={p.id} precedent={p} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed bottom-8 right-8 z-50">
        <Button size="lg" className="rounded-full h-16 px-6 bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:-translate-y-1 transition-all">
          <Scale className="w-5 h-5 mr-2" /> Ask Lex Superior AI
        </Button>
      </div>
    </AppLayout>
  );
}
