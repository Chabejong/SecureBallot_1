import { useState } from "react";
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

export default function Vote() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");

  const { data: poll, isLoading } = useQuery({
    queryKey: ["/api/polls", id],
    select: (data): PollWithDetails => data,
  });

  const { data: hasVoted } = useQuery({
    queryKey: ["/api/polls", id, "has-voted"],
    enabled: !!id,
    select: (data): { hasVoted: boolean } => data,
  });

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return await apiRequest("POST", `/api/polls/${id}/vote`, { optionId });
    },
    onSuccess: () => {
      toast({
        title: "Vote Submitted",
        description: "Your vote has been recorded successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/polls", id, "has-voted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls", id, "results"] });
      setLocation(`/poll/${id}/results`);
    },
    onError: (error: any) => {
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
      toast({
        title: "Error",
        description: error.message || "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVote = () => {
    if (!selectedOptionId) {
      toast({
        title: "Error",
        description: "Please select an option before voting.",
        variant: "destructive",
      });
      return;
    }
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

  if (hasVoted?.hasVoted) {
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
          onOptionSelect={setSelectedOptionId}
          onVote={handleVote}
          isSubmitting={voteMutation.isPending}
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
