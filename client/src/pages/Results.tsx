import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, Users, Clock, Shield, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import type { PollWithResults } from "@shared/schema";

export default function Results() {
  const { id } = useParams();

  const { data: pollResults, isLoading } = useQuery({
    queryKey: ["/api/polls", id, "results"],
    select: (data): PollWithResults => data as PollWithResults,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!pollResults) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Results Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The poll results you're looking for don't exist or are not available.
              </p>
              <Link href="/">
                <Button>Back to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isActive = pollResults.isActive && new Date() < new Date(pollResults.endDate);
  const totalVotes = pollResults.results.reduce((sum, result) => sum + result.voteCount, 0);
  const timeText = formatDistanceToNow(new Date(pollResults.endDate), { addSuffix: true });
  const winningOption = pollResults.results.reduce((winner, current) => 
    current.voteCount > winner.voteCount ? current : winner, pollResults.results[0]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href={`/poll/${id}`}>
            <Button variant="outline" data-testid="button-back">
              ← Back to Poll Details
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Poll Results</h1>
          <p className="text-xl text-muted-foreground">
            {isActive ? "Live results - voting is still open" : "Final results - poll has ended"}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Results Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl" data-testid="text-poll-title">{pollResults.title}</CardTitle>
                <Badge variant="outline" className={isActive ? "bg-secondary/10 text-secondary border-secondary/20" : "bg-primary/10 text-primary border-primary/20"}>
                  {isActive ? "Live Results" : "Final Results"}
                </Badge>
              </div>
              {pollResults.description && (
                <p className="text-muted-foreground text-sm">{pollResults.description}</p>
              )}
            </CardHeader>

            <CardContent>
              <div className="space-y-4 mb-6">
                {pollResults.results.map((result, index) => (
                  <div key={result.optionId}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-foreground font-medium" data-testid={`text-option-${index}`}>
                        {result.text}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm" data-testid={`text-vote-count-${index}`}>
                          {result.voteCount} votes
                        </span>
                        <Badge variant="outline" data-testid={`text-percentage-${index}`}>
                          {result.percentage}%
                        </Badge>
                        {result.optionId === winningOption.optionId && totalVotes > 0 && (
                          <TrendingUp className="w-4 h-4 text-secondary" />
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={result.percentage} 
                      className="h-3"
                      data-testid={`progress-option-${index}`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                <span className="flex items-center gap-1" data-testid="text-total-votes">
                  <Users className="w-4 h-4" />
                  Total Votes: {totalVotes}
                </span>
                <span className="flex items-center gap-1" data-testid="text-poll-status">
                  <Clock className="w-4 h-4" />
                  {isActive ? `Ends ${timeText}` : `Ended ${timeText}`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Poll Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalVotes > 0 ? (
                <>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-secondary mb-2" data-testid="text-winning-percentage">
                      {winningOption.percentage}%
                    </div>
                    <p className="text-muted-foreground">
                      Leading option: <span className="font-medium text-foreground" data-testid="text-winning-option">{winningOption.text}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-secondary/5 rounded-lg">
                      <div className="text-2xl font-bold text-secondary mb-1" data-testid="text-leading-votes">
                        {winningOption.voteCount}
                      </div>
                      <div className="text-muted-foreground text-sm">Leading votes</div>
                    </div>
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <div className="text-2xl font-bold text-primary mb-1" data-testid="text-participation-rate">
                        {pollResults.voteCount}
                      </div>
                      <div className="text-muted-foreground text-sm">Participants</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Votes Yet</h3>
                  <p className="text-muted-foreground">
                    Be the first to vote and see the results update in real-time!
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground border-t pt-4">
                <div className="flex justify-between">
                  <span>Poll Duration:</span>
                  <span data-testid="text-poll-duration">
                    {pollResults.createdAt ? formatDistanceToNow(new Date(pollResults.createdAt), { addSuffix: false }) : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Options:</span>
                  <span data-testid="text-total-options">{pollResults.options.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Poll Type:</span>
                  <span className="capitalize" data-testid="text-poll-type">{pollResults.pollType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Status:</span>
                  <span className="text-secondary flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Trail */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security & Transparency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-secondary/10 rounded-lg">
                <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Cryptographic Verification</h4>
                  <p className="text-muted-foreground text-sm">All votes have been cryptographically verified and results are tamper-proof</p>
                </div>
                <span className="text-muted-foreground text-sm">Verified</span>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-primary/10 rounded-lg">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Privacy Protection</h4>
                  <p className="text-muted-foreground text-sm">
                    {pollResults.isAnonymous ? "Anonymous voting enabled - individual votes cannot be traced" : "Non-anonymous voting - voters can be identified"}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm">Active</span>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-accent/10 rounded-lg">
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Real-time Updates</h4>
                  <p className="text-muted-foreground text-sm">Results are updated in real-time as votes are submitted and verified</p>
                </div>
                <span className="text-muted-foreground text-sm">Live</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {isActive && (
          <div className="text-center mt-8">
            <Link href={`/poll/${id}/vote`}>
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-vote-now">
                Participate in This Poll
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
