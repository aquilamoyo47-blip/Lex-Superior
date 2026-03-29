import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Scale, BookOpen, FileText, FolderClosed, Info, MessageSquare, Menu, X, Gavel, Users, LogIn, LogOut, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/CommandPalette";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
  const [commandOpen, setCommandOpen] = useState(false);
  const { isAuthenticated, login, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Disclaimer Banner */}
      {!disclaimerDismissed && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 relative flex items-start sm:items-center justify-between z-50">
          <div className="flex gap-3 items-start sm:items-center max-w-7xl mx-auto w-full">
            <Scale className="w-4 h-4 text-destructive shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-xs text-foreground/80 font-medium pr-8">
              <strong className="text-destructive font-bold">Notice:</strong> All outputs constitute legal research assistance only and do not constitute formal legal advice. Consult a duly registered legal practitioner.
            </p>
          </div>
          <button
            onClick={() => setDisclaimerDismissed(true)}
            className="absolute right-4 top-2.5 sm:top-1/2 sm:-translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <header className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled ? "glass-panel shadow-md" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg leading-none text-foreground">Lex Superior AI</h1>
              <span className="text-[9px] uppercase tracking-widest text-primary font-semibold">Zimbabwe Civil Law</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const isHighlight = (item as any).highlight;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "px-3 transition-all duration-200 text-sm",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : isHighlight
                        ? "text-primary border border-primary/20 hover:bg-primary/10 font-semibold"
                        : "text-foreground/70 hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Command Palette Trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/8 bg-white/3 hover:bg-white/6 transition-all text-xs text-muted-foreground/60 hover:text-muted-foreground"
            title="Open command palette (⌘K)"
          >
            <Command className="w-3 h-3" />
            <span>Quick nav</span>
            <kbd className="ml-1 px-1 py-0.5 font-mono text-[10px] rounded bg-white/5 border border-white/10">⌘K</kbd>
          </button>

          {/* Auth + Mobile Nav */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="hidden sm:flex text-foreground/60 hover:text-foreground text-sm"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign out
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={login}
                className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <LogIn className="w-3.5 h-3.5 mr-1.5" />
                Sign in
              </Button>
            )}

            {/* Mobile Nav */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-foreground h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background/95 backdrop-blur-xl border-white/10 w-[280px]">
                <div className="flex flex-col gap-4 mt-8">
                  {NAV_ITEMS.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button variant="ghost" className="w-full justify-start text-base h-11">
                        <item.icon className="w-4 h-4 mr-3 text-primary" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                  <div className="pt-2 border-t border-white/5">
                    {isAuthenticated ? (
                      <Button variant="ghost" onClick={logout} className="w-full justify-start text-base h-11 text-muted-foreground">
                        <LogOut className="w-4 h-4 mr-3" /> Sign out
                      </Button>
                    ) : (
                      <Button onClick={login} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
                        <LogIn className="w-4 h-4 mr-2" /> Sign in
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-background py-10 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-40">
            <Scale className="w-4 h-4" />
            <span className="font-display font-semibold text-sm">Lex Superior AI</span>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xl">
            AI-powered legal research for Zimbabwe's Superior Courts. Civil law scope only — not for criminal matters.
          </p>
          <div className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Lex Superior AI
          </div>
        </div>
      </footer>
    </div>
  );
}
