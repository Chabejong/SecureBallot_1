import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/Header";
import { VotingInterface } from "@/components/VotingInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AlertCircle, CheckCircle, Shield } from "lucide-react";
import type { PollWithDetails } from "@shared/schema";
import { generateEnhancedFingerprint } from "@/lib/fingerprint";
import { voteStorage } from "@/lib/voteStorage";
import { generateVoteToken, serializeVoteToken } from "@/lib/voteToken";

export default function Vote() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOptionId, setSelectedOptionId] = useState<string | string[]>("");
  const [authNumber, setAuthNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoadTime] = useState(Date.now());
  const [browserFingerprint, setBrowserFingerprint] = useState<string>("");
  
  // Initialize enhanced fingerprint and vote storage
  useEffect(() => {
    const init = async () => {
      const fingerprint = await generateEnhancedFingerprint();
      setBrowserFingerprint(fingerprint);
      await voteStorage.init();
    };
    init();
  }, []);

  const { data: poll, isLoading } = useQuery({
    queryKey: [`/api/public/polls/${id}`],
    enabled: !!id,
    select: (data): PollWithDetails => data as PollWithDetails,
  });

  const { data: hasVoted } = useQuery({
    queryKey: [`/api/polls/${id}/has-voted`, browserFingerprint],
    enabled: !!id && !!browserFingerprint,
    queryFn: async () => {
      const res = await fetch(`/api/polls/${id}/has-voted`, {
        headers: {
          'X-Fingerprint': browserFingerprint,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to check vote status');
      return res.json();
    },
    select: (data): { hasVoted: boolean } => data as { hasVoted: boolean },
  });

  const voteMutation = useMutation({
    mutationFn: async (optionIds: string | string[]) => {
      if (!id) throw new Error('Poll ID is required');
      
      // Send appropriate request based on poll type with browser fingerprint
      const body = poll?.isMultipleChoice 
        ? { 
            optionIds: Array.isArray(optionIds) ? optionIds : [optionIds],
            authNumber: authNumber ? parseInt(authNumber) : undefined,
          }
        : { 
            optionId: Array.isArray(optionIds) ? optionIds[0] : optionIds,
            authNumber: authNumber ? parseInt(authNumber) : undefined,
          };
      
      const res = await fetch(`/api/polls/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fingerprint': browserFingerprint,
        },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit vote');
      }
      
      return res.json();
    },
    onMutate: async () => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: [`/api/polls/${id}/has-voted`] });
      
      // Snapshot the previous value for rollback
      const previousHasVoted = queryClient.getQueryData<{ hasVoted: boolean }>([`/api/polls/${id}/has-voted`]);
      
      // Optimistically update to prevent duplicate submissions
      queryClient.setQueryData([`/api/polls/${id}/has-voted`], { hasVoted: true });
      
      // Return context with snapshot for use in onSuccess and onError
      return { previousHasVoted };
    },
    onSuccess: async (_data, variables, context) => {
      const isVoteChange = context?.previousHasVoted?.hasVoted ?? false;
      
      // Record vote in client-side storage
      if (id) {
        const optionIds = Array.isArray(variables) ? variables : [variables];
        await voteStorage.recordVote(id, browserFingerprint, optionIds as string[]);
      }
      
      toast({
        title: isVoteChange ? "Vote Updated" : "Vote Submitted",
        description: isVoteChange 
          ? "Your vote has been updated successfully!" 
          : "Your vote has been recorded successfully!",
      });
      // Await invalidation to ensure data is synced before navigation
      await queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}/has-voted`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}/results`] });
      setLocation(`/poll/${id}/results`);
    },
    onError: async (error: any, _variables, context) => {
      // Rollback optimistic update using snapshot
      if (context?.previousHasVoted !== undefined) {
        queryClient.setQueryData([`/api/polls/${id}/has-voted`], context.previousHasVoted);
      } else {
        // Fallback: invalidate if no snapshot
        await queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}/has-voted`] });
      }
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      // Handle "already voted" message as informational rather than error
      if (error.message && error.message.includes("You have already voted in this poll")) {
        toast({
          title: "Already Voted",
          description: "You have already submitted your vote for this poll. Thank you for participating!",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Clear submitting state regardless of success or error
      setIsSubmitting(false);
    },
  });

  const handleOptionSelect = (optionId: string | string[]) => {
    // Prevent option changes while submitting
    if (isSubmitting || voteMutation.isPending) return;
    setSelectedOptionId(optionId);
  };

  const handleVote = () => {
    // Prevent multiple submissions
    if (isSubmitting || voteMutation.isPending) return;
    
    const hasSelection = Array.isArray(selectedOptionId) 
      ? selectedOptionId.length > 0
      : selectedOptionId !== "";
      
    if (!hasSelection) {
      toast({
        title: "Error",
        description: "Please select at least one option before voting.",
        variant: "destructive",
      });
      return;
    }
    
    // Set submitting state immediately before mutation
    setIsSubmitting(true);
    voteMutation.mutate(selectedOptionId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Poll Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The poll you're trying to vote on doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/")}>Back to Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isActive = poll.isActive && new Date() < new Date(poll.endDate);

  if (!isActive) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Poll Ended</h2>
              <p className="text-muted-foreground mb-4">
                This poll has ended and is no longer accepting votes.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => setLocation(`/poll/${id}/results`)}>
                  View Results
                </Button>
                <Button variant="outline" onClick={() => setLocation("/")}>
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (hasVoted?.hasVoted && !poll.allowVoteChanges) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Already Voted</h2>
              <p className="text-muted-foreground mb-4">
                You have already submitted your vote for this poll. Thank you for participating!
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => setLocation(`/poll/${id}/results`)}>
                  View Results
                </Button>
                <Button variant="outline" onClick={() => setLocation("/")}>
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation(`/poll/${id}`)}
            data-testid="button-back"
          >
            ← Back to Poll Details
          </Button>
        </div>

        <VotingInterface
          poll={poll}
          selectedOptionId={selectedOptionId}
          onOptionSelect={handleOptionSelect}
          onVote={handleVote}
          isSubmitting={isSubmitting || voteMutation.isPending}
          hasVoted={hasVoted?.hasVoted}
          authNumber={authNumber}
          onAuthNumberChange={setAuthNumber}
        />

        {/* Security Notice */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Your vote is secure and anonymous</p>
                <p>
                  This poll uses end-to-end encryption. Your vote cannot be traced back to you, 
                  and the results are verifiable through our public audit trail.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
