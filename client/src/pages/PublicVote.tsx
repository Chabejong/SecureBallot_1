import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VotingInterface } from "@/components/VotingInterface";
import { PollResults } from "@/components/PollResults";
import { Clock, Users, BarChart3, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Generate browser fingerprint for duplicate vote prevention
const generateBrowserFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown',
  ].join('|');
  
  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

export default function PublicVote() {
  const [, params] = useRoute("/vote/:slug");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResults, setShowResults] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | string[]>("");

  // Store fingerprint in localStorage for consistency
  const [browserFingerprint] = useState(() => {
    const stored = localStorage.getItem('browser_fingerprint');
    if (stored) return stored;
    
    const fingerprint = generateBrowserFingerprint();
    localStorage.setItem('browser_fingerprint', fingerprint);
    return fingerprint;
  });

  const { data: poll, isLoading: isPollLoading, error: pollError } = useQuery({
    queryKey: [`/api/public/polls/${params?.slug}`],
    enabled: !!params?.slug,
    queryFn: async () => {
      const response = await fetch(`/api/public/polls/${params?.slug}`);
      if (!response.ok) {
        throw new Error('Poll not found');
      }
      return response.json();
    },
  });

  const { data: hasVotedData } = useQuery({
    queryKey: [`/api/public/polls/${params?.slug}/has-voted`],
    enabled: !!params?.slug,
    queryFn: async () => {
      const response = await fetch(`/api/public/polls/${params?.slug}/has-voted`, {
        headers: {
          'X-Fingerprint': browserFingerprint,
        },
      });
      return response.json();
    },
  });

  const { data: results } = useQuery({
    queryKey: [`/api/public/polls/${params?.slug}/results`],
    enabled: !!params?.slug && (showResults || hasVotedData?.hasVoted),
    queryFn: async () => {
      const response = await fetch(`/api/public/polls/${params?.slug}/results`);
      return response.json();
    },
  });

  const submitVoteMutation = useMutation({
    mutationFn: async (optionIds: string[]) => {
      const response = await fetch(`/api/public/polls/${params?.slug}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fingerprint': browserFingerprint,
        },
        body: JSON.stringify({ 
          optionIds: poll?.isMultipleChoice ? optionIds : undefined,
          optionId: poll?.isMultipleChoice ? undefined : optionIds[0]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit vote');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vote Submitted!",
        description: "Your anonymous vote has been recorded.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/public/polls/${params?.slug}/has-voted`] });
      queryClient.invalidateQueries({ queryKey: [`/api/public/polls/${params?.slug}/results`] });
      
      // Show results after voting
      setShowResults(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize selected option based on poll type
  useEffect(() => {
    if (poll) {
      setSelectedOptionId(poll.isMultipleChoice ? [] : "");
    }
  }, [poll?.isMultipleChoice]);

  // Show results automatically if poll has ended
  useEffect(() => {
    if (poll && new Date() > new Date(poll.endDate)) {
      setShowResults(true);
    }
  }, [poll]);

  // Handle option selection
  const handleOptionSelect = (optionId: string | string[]) => {
    setSelectedOptionId(optionId);
  };

  if (isPollLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading poll...</div>
        </div>
      </div>
    );
  }

  if (pollError || !poll) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Poll Not Found</h1>
            <p className="text-muted-foreground mb-4">
              This poll doesn't exist or is not publicly accessible.
            </p>
            <Button onClick={() => window.location.href = "/"}>
              ← Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasEnded = new Date() > new Date(poll.endDate);
  const hasVoted = hasVotedData?.hasVoted;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Poll Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="secondary">
              <ExternalLink className="w-4 h-4 mr-1" />
              Public Poll
            </Badge>
            <Badge variant={hasEnded ? "destructive" : "default"}>
              <Clock className="w-4 h-4 mr-1" />
              {hasEnded ? "Ended" : "Active"}
            </Badge>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" data-testid="text-poll-title">
            {poll.title}
          </h1>
          {poll.description && (
            <p className="text-xl text-muted-foreground mb-4" data-testid="text-poll-description">
              {poll.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{poll.voteCount || 0} votes</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Ends {new Date(poll.endDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Voting or Results */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {showResults || hasVoted || hasEnded ? "Results" : "Cast Your Vote"}
              </span>
              {!hasEnded && (hasVoted || showResults) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResults(!showResults)}
                  data-testid="button-toggle-view"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showResults ? "Hide Results" : "Show Results"}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Show voting interface if not ended and haven't voted */}
            {!hasEnded && !hasVoted && !showResults && (
              <div>
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    🔒 <strong>Anonymous Voting:</strong> No login required. Your vote is completely anonymous 
                    and secure. Each device can vote once.
                  </p>
                </div>
                <VotingInterface
                  poll={poll}
                  selectedOptionId={selectedOptionId}
                  onOptionSelect={handleOptionSelect}
                  onVote={() => {
                    const optionIds = Array.isArray(selectedOptionId) ? selectedOptionId : [selectedOptionId];
                    submitVoteMutation.mutate(optionIds.filter(Boolean));
                  }}
                  isSubmitting={submitVoteMutation.isPending}
                  hasVoted={false}
                  data-testid="voting-interface"
                />
              </div>
            )}

            {/* Show results */}
            {(showResults || hasVoted || hasEnded) && results && (
              <div>
                {hasVoted && !hasEnded && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✓ <strong>Vote Recorded:</strong> Thank you for participating! 
                      Your anonymous vote has been counted.
                    </p>
                  </div>
                )}
                {hasEnded && (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      📊 <strong>Final Results:</strong> This poll has ended. 
                      Here are the final voting results.
                    </p>
                  </div>
                )}
                <PollResults results={results} data-testid="poll-results" />
              </div>
            )}

            {/* Poll ended but haven't voted */}
            {hasEnded && !hasVoted && !showResults && (
              <div className="text-center py-8">
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    ⏰ <strong>Poll Ended:</strong> Voting is no longer available for this poll.
                  </p>
                </div>
                <Button onClick={() => setShowResults(true)} data-testid="button-view-results">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Final Results
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-4">
            Powered by <strong>The Ballot Box</strong> • Anonymous & Secure Voting
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Create Your Own Poll
          </Button>
        </div>
      </div>
    </div>
  );
}