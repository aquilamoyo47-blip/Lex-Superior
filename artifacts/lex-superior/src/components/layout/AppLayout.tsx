import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Scale, BookOpen, FileText, FolderClosed, Info, MessageSquare, Menu, X, Gavel, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Scale },
  { href: "/council", label: "AI Council", icon: Users, highlight: true },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/vault", label: "Vault", icon: FolderClosed },
  { href: "/guides", label: "Guides", icon: Gavel },
  { href: "/about", label: "About", icon: Info },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Disclaimer Banner */}
      {!disclaimerDismissed && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 relative flex items-start sm:items-center justify-between z-50">
          <div className="flex gap-3 items-start sm:items-center max-w-7xl mx-auto w-full">
            <Scale className="w-5 h-5 text-destructive shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-foreground/90 font-medium pr-8">
              <strong className="text-destructive font-bold">Notice:</strong> Lex Superior AI is an AI-powered legal research assistant. All outputs constitute legal research assistance only and do not constitute formal legal advice. Consult a duly registered legal practitioner.
            </p>
          </div>
          <button 
            onClick={() => setDisclaimerDismissed(true)}
            className="absolute right-4 top-3 sm:top-1/2 sm:-translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <header className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled ? "glass-panel shadow-md" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl leading-none text-foreground tracking-wide">Lex Superior AI</h1>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Zimbabwe Civil Law</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const isHighlight = (item as any).highlight;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "px-4 transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : isHighlight
                        ? "text-primary border border-primary/30 hover:bg-primary/10 font-semibold"
                        : "text-foreground/70 hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2 opacity-70" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-foreground">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background/95 backdrop-blur-xl border-white/10 w-[300px]">
              <div className="flex flex-col gap-6 mt-8">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button variant="ghost" className="w-full justify-start text-lg h-12">
                      <item.icon className="w-5 h-5 mr-4 text-primary" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-background py-12 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale">
            <Scale className="w-5 h-5" />
            <span className="font-display font-semibold">Lex Superior AI</span>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-2xl">
            "Your Expert AI Legal Advocate for the Superior Courts of Zimbabwe."<br/>
            Civil law and civil litigation scope only. Not for criminal matters.
          </p>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Lex Superior AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
