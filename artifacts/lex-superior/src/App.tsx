import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/AuthGate";
import Landing from "@/pages/Landing";
import Chat from "@/pages/Chat";
import Council from "@/pages/Council";
import Documents from "@/pages/Documents";
import Library from "@/pages/Library";
import Vault from "@/pages/Vault";
import Guides from "@/pages/Guides";
import About from "@/pages/About";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/council">
        <AuthGate><Council /></AuthGate>
      </Route>
      <Route path="/chat">
        <AuthGate><Chat /></AuthGate>
      </Route>
      <Route path="/documents">
        <AuthGate><Documents /></AuthGate>
      </Route>
      <Route path="/library">
        <AuthGate><Library /></AuthGate>
      </Route>
      <Route path="/vault">
        <AuthGate><Vault /></AuthGate>
      </Route>
      <Route path="/guides">
        <AuthGate><Guides /></AuthGate>
      </Route>
      <Route path="/about">
        <AuthGate><About /></AuthGate>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
