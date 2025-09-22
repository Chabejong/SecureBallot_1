import { useState, useEffect, useRef } from "react";
import { Switch, Route, Redirect } from "wouter";
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
import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PublicVote from "@/pages/PublicVote";
import AuthenticatedPoll from "@/pages/AuthenticatedPoll";
import PollConfirmation from "@/pages/PollConfirmation";
import NotFound from "@/pages/not-found";

// Protected route wrapper that handles auth states properly
function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType<any> }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  console.log('ProtectedRoute render - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);
  
  // If we have a user and they're authenticated, show the component
  if (user && isAuthenticated) {
    console.log('ProtectedRoute allowing access to component');
    return <Component {...props} />;
  }
  
  // If not loading and not authenticated, redirect to auth immediately
  if (!isLoading && !isAuthenticated) {
    console.log('ProtectedRoute redirecting - not loading and not authenticated');
    return <Redirect to="/auth" />;
  }
  
  // Show loading only while actually loading
  console.log('ProtectedRoute showing loading state');
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-lg">Loading...</div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes available to everyone */}
      <Route path="/landing" component={Landing} />
      <Route path="/vote/:slug" component={PublicVote} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/auth" component={Auth} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Authenticated poll access route */}
      <Route path="/auth/poll/:slug" component={(props) => <ProtectedRoute component={AuthenticatedPoll} {...props} />} />
      
      {/* Home route - redirect to auth if not authenticated */}
      <Route path="/" component={!isLoading && isAuthenticated ? Home : () => <Redirect to="/auth" />} />
      
      {/* Protected routes - always registered but with auth checks */}
      <Route path="/create" component={(props) => <ProtectedRoute component={CreatePoll} {...props} />} />
      <Route path="/poll/:id" component={(props) => <ProtectedRoute component={PollDetails} {...props} />} />
      <Route path="/poll/:id/confirmation" component={(props) => <ProtectedRoute component={PollConfirmation} {...props} />} />
      <Route path="/poll/:id/vote" component={(props) => <ProtectedRoute component={Vote} {...props} />} />
      <Route path="/poll/:id/results" component={(props) => <ProtectedRoute component={Results} {...props} />} />
      
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
