import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import Chat from "@/pages/Chat";
import Council from "@/pages/Council";
import Documents from "@/pages/Documents";
import Library from "@/pages/Library";
import Vault from "@/pages/Vault";
import Guides from "@/pages/Guides";
import About from "@/pages/About";
import Training from "@/pages/Training";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/council" component={Council} />
      <Route path="/chat" component={Chat} />
      <Route path="/documents" component={Documents} />
      <Route path="/library" component={Library} />
      <Route path="/vault" component={Vault} />
      <Route path="/guides" component={Guides} />
      <Route path="/about" component={About} />
      <Route path="/training" component={Training} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
