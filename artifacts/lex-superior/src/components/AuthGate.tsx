import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, ArrowRight, Mail, Lock, User } from "lucide-react";

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthView = "login" | "signup";

function AuthModal() {
  const { login } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative w-full max-w-md glass-card rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg leading-none text-foreground">Lex Superior AI</h2>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Zimbabwe Civil Law</span>
            </div>
          </div>

          <h3 className="text-2xl font-display font-bold text-foreground mb-1">
            {view === "login" ? "Welcome back" : "Create your account"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {view === "login"
              ? "Sign in to access your legal workspace."
              : "Join to get instant access to AI-powered legal research."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {view === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-card border-white/10 focus:border-primary/50"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-card border-white/10 focus:border-primary/50"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-card border-white/10 focus:border-primary/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
            >
              {view === "login" ? "Sign in" : "Create account"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {view === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setView("signup")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setView("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-center text-xs text-muted-foreground">
            By continuing, you agree that all outputs constitute legal research assistance only and not formal legal advice.
          </div>

          <div className="mt-3 text-center text-xs text-muted-foreground">
            Want to explore first?{" "}
            <a href="/?demo=1" className="text-primary hover:underline font-medium">Request a Demo</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: AuthGateProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return <>{children}</>;
}
