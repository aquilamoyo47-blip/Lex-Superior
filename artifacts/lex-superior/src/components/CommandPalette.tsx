import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, MessageSquare, Users, FileText, BookOpen,
  FolderClosed, Gavel, Info, PlusCircle, Search, Command as CommandIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const COMMANDS = [
  {
    group: "Navigation",
    items: [
      { id: "home", label: "Go to Home", icon: Scale, href: "/" },
      { id: "chat", label: "Open Chat", icon: MessageSquare, href: "/chat" },
      { id: "council", label: "AI Council", icon: Users, href: "/council" },
      { id: "documents", label: "Documents", icon: FileText, href: "/documents" },
      { id: "library", label: "Case Library", icon: BookOpen, href: "/library" },
      { id: "vault", label: "Vault", icon: FolderClosed, href: "/vault" },
      { id: "guides", label: "Procedure Guides", icon: Gavel, href: "/guides" },
      { id: "about", label: "About", icon: Info, href: "/about" },
    ],
  },
  {
    group: "Actions",
    items: [
      { id: "new-consultation", label: "New Consultation", icon: PlusCircle, href: "/chat" },
      { id: "search-cases", label: "Search Case Law", icon: Search, href: "/library" },
    ],
  },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const runCommand = useCallback((href: string) => {
    navigate(href);
    onClose();
  }, [navigate, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-lg z-10"
          >
            <div className="rounded-2xl border border-white/10 bg-card/90 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden"
              style={{ boxShadow: "0 0 0 1px rgba(201,168,76,0.2), 0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(201,168,76,0.08)" }}>
              <Command className="[&_[cmdk-input-wrapper]]:border-none [&_[cmdk-input]]:bg-transparent" loop onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } }}>
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Command.Input
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search pages and actions..."
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
                    onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/5 text-muted-foreground border border-white/10">ESC</kbd>
                  </div>
                </div>
                <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                  <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                    No results for "{query}"
                  </Command.Empty>
                  {COMMANDS.map((group) => (
                    <Command.Group key={group.group} heading={group.group} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/60 mb-1">
                      {group.items.map((item) => (
                        <Command.Item
                          key={item.id}
                          value={item.label}
                          onSelect={() => runCommand(item.href)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer",
                            "text-foreground/80 transition-all duration-100",
                            "data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary",
                            "hover:bg-white/5"
                          )}
                        >
                          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 data-[selected]:bg-primary/20">
                            <item.icon className="w-3.5 h-3.5" />
                          </div>
                          <span>{item.label}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ))}
                </Command.List>
                <div className="border-t border-white/5 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                    <CommandIcon className="w-3 h-3" />
                    <span>Lex Superior Command Palette</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                    <kbd className="px-1 py-0.5 font-mono rounded bg-white/5 border border-white/8">↑↓</kbd>
                    <span>navigate</span>
                    <kbd className="px-1 py-0.5 font-mono rounded bg-white/5 border border-white/8 ml-1">↵</kbd>
                    <span>select</span>
                  </div>
                </div>
              </Command>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
