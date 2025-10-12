import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { PollResults } from "@/components/PollResults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Users, Lock, UserCheck, Calendar, Clock, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { PollWithDetails, PollWithResults } from "@shared/schema";

export default function AuthenticatedPoll() {
  const [, params] = useRoute("/auth/poll/:slug");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [authNumber, setAuthNumber] = useState<string>("");
  const [showResults, setShowResults] = useState(false);

  const { data: poll, isLoading: pollLoading, error: pollError } = useQuery<PollWithDetails>({
    queryKey: [`/api/auth/polls/${params?.slug}`],
    enabled: !!params?.slug,
    retry: false,
  });

  const { data: hasVoted, isLoading: hasVotedLoading, error: hasVotedError } = useQuery<{ hasVoted: boolean }>({
    queryKey: [`/api/auth/polls/${params?.slug}/has-voted`],
    enabled: !!params?.slug,
    retry: false,
  });

  const { data: results } = useQuery<PollWithResults>({
    queryKey: [`/api/auth/polls/${params?.slug}/results`],
    enabled: !!params?.slug && (hasVoted?.hasVoted || showResults),
    retry: false,
  });

  // Handle authentication errors
  useEffect(() => {
    const checkAuthError = (error: any) => {
      if (error?.message?.includes('401') || error?.status === 401) {
        setLocation('/');
        return true;
      }
      return false;
    };

    if (pollError && checkAuthError(pollError)) return;
    if (hasVotedError && checkAuthError(hasVotedError)) return;
  }, [pollError, hasVotedError, setLocation]);

  const voteMutation = useMutation({
    mutationFn: async ({ optionId, authNumber }: { optionId: string; authNumber?: string }) => {
      return apiRequest("POST", `/api/auth/polls/${params?.slug}/vote`, { 
        optionId,
        authNumber: authNumber ? parseInt(authNumber) : undefined
      });
    },
    onSuccess: () => {
      toast({
        title: "Vote submitted!",
        description: "Your vote has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/auth/polls/${params?.slug}/has-voted`] });
      queryClient.invalidateQueries({ queryKey: [`/api/auth/polls/${params?.slug}/results`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit vote",
        variant: "destructive",
      });
    },
  });

  const handleVote = () => {
    if (selectedOptions.length === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one option before voting.",
        variant: "destructive",
      });
      return;
    }

    if (poll?.isMultipleChoice && selectedOptions.length > 1) {
      toast({
        title: "Multiple selection not supported yet",
        description: "Please select only one option for now.",
        variant: "destructive",
      });
      return;
    }

    // Check if authentication number is required
    const requiresAuthNumber = poll?.pollType === "members" && 
      poll.authNumberStart !== null && 
      poll.authNumberStart !== undefined && 
      poll.authNumberEnd !== null && 
      poll.authNumberEnd !== undefined;

    if (requiresAuthNumber && !authNumber) {
      toast({
        title: "Authentication Number Required",
        description: "Please enter your authentication number to vote.",
        variant: "destructive",
      });
      return;
    }

    voteMutation.mutate({ optionId: selectedOptions[0], authNumber });
  };

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (poll?.isMultipleChoice) {
      if (checked) {
        setSelectedOptions([...selectedOptions, optionId]);
      } else {
        setSelectedOptions(selectedOptions.filter(id => id !== optionId));
      }
    } else {
      setSelectedOptions(checked ? [optionId] : []);
    }
  };

  const getPollTypeIcon = (pollType: string) => {
    switch (pollType) {
      case 'members': return <Users className="w-4 h-4" />;
      case 'invited': return <UserCheck className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const getPollTypeName = (pollType: string) => {
    switch (pollType) {
      case 'members': return 'Members Only';
      case 'invited': return 'Invited Only';
      default: return 'Private Poll';
    }
  };

  if (pollLoading || hasVotedLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Poll Not Found</h1>
            <p className="text-muted-foreground">
              This poll doesn't exist or you don't have permission to access it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pollEnded = new Date() > new Date(poll.endDate);
  const userHasVoted = hasVoted?.hasVoted;
  const shouldShowResults = userHasVoted || pollEnded || showResults;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Poll Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="outline" className="mb-4">
              {getPollTypeIcon(poll.pollType)}
              <span className="ml-1">{getPollTypeName(poll.pollType)}</span>
            </Badge>
          </div>
          
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" data-testid="text-poll-title">
            {poll.title}
          </h1>
          
          {poll.description && (
            <p className="text-lg text-muted-foreground mb-4" data-testid="text-poll-description">
              {poll.description}
            </p>
          )}

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Ends {new Date(poll.endDate).toLocaleDateString()}</span>
            </div>
            {pollEnded && (
              <div className="flex items-center gap-1 text-destructive">
                <Clock className="w-4 h-4" />
                <span>Poll Ended</span>
              </div>
            )}
          </div>
        </div>

        {shouldShowResults ? (
          /* Results View */
          <div className="space-y-6">
            {userHasVoted && (
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✅ Thank you for voting! Here are the current results:
                </p>
              </div>
            )}
            
            {pollEnded && (
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-orange-800 dark:text-orange-200 font-medium">
                  ⏰ This poll has ended. Final results:
                </p>
              </div>
            )}

            {results && <PollResults results={results} />}
          </div>
        ) : (
          /* Voting View */
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Cast Your Vote</span>
                {poll.isAnonymous && (
                  <Badge variant="secondary" className="text-xs">
                    Anonymous
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {poll.isMultipleChoice ? (
                /* Multiple Choice Options */
                <div className="space-y-3">
                  {poll.options?.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={selectedOptions.includes(option.id)}
                        onCheckedChange={(checked) => handleOptionChange(option.id, !!checked)}
                        data-testid={`checkbox-option-${option.order}`}
                      />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          {option.imageUrl && (
                            <img 
                              src={option.imageUrl} 
                              alt={`Option ${option.order}`}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <span className="text-base">{option.text}</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single Choice Options */
                <RadioGroup
                  value={selectedOptions[0] || ""}
                  onValueChange={(value) => setSelectedOptions([value])}
                  className="space-y-3"
                >
                  {poll.options?.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={option.id} 
                        id={option.id}
                        data-testid={`radio-option-${option.order}`}
                      />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          {option.imageUrl && (
                            <img 
                              src={option.imageUrl} 
                              alt={`Option ${option.order}`}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <span className="text-base">{option.text}</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* Authentication Number Input */}
              {poll.pollType === "members" && poll.authNumberStart && poll.authNumberEnd && (
                <div className="mt-6 p-4 bg-primary/5 border border-primary/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Authentication Number Required</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter your unique authentication number to vote. This number can only be used once.
                  </p>
                  <Input
                    type="number"
                    placeholder={`Enter number between ${poll.authNumberStart} and ${poll.authNumberEnd}`}
                    value={authNumber}
                    onChange={(e) => setAuthNumber(e.target.value)}
                    disabled={voteMutation.isPending}
                    className="max-w-md"
                    data-testid="input-auth-number"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleVote}
                  disabled={selectedOptions.length === 0 || voteMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-vote"
                >
                  {voteMutation.isPending ? "Submitting..." : "Submit Vote"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowResults(true)}
                  data-testid="button-view-results"
                >
                  View Results
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {poll.allowVoteChanges 
                  ? "You can change your vote until the poll ends."
                  : "Your vote is final and cannot be changed."
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}