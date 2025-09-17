import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import CreatePoll from "@/pages/CreatePoll";
import PollDetails from "@/pages/PollDetails";
import Vote from "@/pages/Vote";
import Results from "@/pages/Results";
import HowItWorks from "@/pages/HowItWorks";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/how-it-works" component={HowItWorks} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/create" component={CreatePoll} />
          <Route path="/poll/:id" component={PollDetails} />
          <Route path="/poll/:id/vote" component={Vote} />
          <Route path="/poll/:id/results" component={Results} />
          <Route path="/how-it-works" component={HowItWorks} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
