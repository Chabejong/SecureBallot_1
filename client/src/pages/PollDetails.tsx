import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Vote, BarChart3, Clock, Users, Shield, User, CheckCircle, AlertCircle } from "lucide-react";
import type { PollWithDetails } from "@shared/schema";

export default function PollDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: poll, isLoading } = useQuery({
    queryKey: ["/api/polls", id],
    select: (data): PollWithDetails => data,
  });

  const { data: hasVoted } = useQuery({
    queryKey: ["/api/polls", id, "has-voted"],
    enabled: !!id,
    select: (data): { hasVoted: boolean } => data,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-32 w-full mb-6" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Poll Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The poll you're looking for doesn't exist or has been removed.
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

  const isActive = poll.isActive && new Date() < new Date(poll.endDate);
  const isOwner = user?.id === poll.createdById;
  const timeRemaining = formatDistanceToNow(new Date(poll.endDate), { addSuffix: true });

  const getPollTypeInfo = (type: string) => {
    switch (type) {
      case "public":
        return { icon: Users, label: "Public Poll", color: "bg-secondary/10 text-secondary border-secondary/20" };
      case "members":
        return { icon: User, label: "Members Only", color: "bg-primary/10 text-primary border-primary/20" };
      case "invited":
        return { icon: Shield, label: "Invited Only", color: "bg-accent/10 text-accent border-accent/20" };
      default:
        return { icon: Users, label: "Public Poll", color: "bg-secondary/10 text-secondary border-secondary/20" };
    }
  };

  const pollTypeInfo = getPollTypeInfo(poll.pollType);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" data-testid="button-back">
              ← Back to Polls
            </Button>
          </Link>
        </div>

        {/* Poll Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="outline" className={pollTypeInfo.color}>
                    <pollTypeInfo.icon className="w-3 h-3 mr-1" />
                    {pollTypeInfo.label}
                  </Badge>
                  {isActive ? (
                    <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                      <Clock className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      Ended
                    </Badge>
                  )}
                  {poll.isAnonymous && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      <Shield className="w-3 h-3 mr-1" />
                      Anonymous
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl lg:text-3xl mb-3" data-testid="text-poll-title">
                  {poll.title}
                </CardTitle>
                {poll.description && (
                  <p className="text-muted-foreground mb-4" data-testid="text-poll-description">
                    {poll.description}
                  </p>
                )}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Created by {poll.creator?.firstName || poll.creator?.email || 'Anonymous'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {poll.voteCount} votes
                  </span>
                  <span className="flex items-center gap-1" data-testid="text-time-remaining">
                    <Clock className="w-4 h-4" />
                    {isActive ? `Ends ${timeRemaining}` : `Ended ${timeRemaining}`}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          {isActive && !hasVoted?.hasVoted && (
            <Link href={`/poll/${poll.id}/vote`}>
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-vote-now">
                <Vote className="w-4 h-4 mr-2" />
                Vote Now
              </Button>
            </Link>
          )}
          
          {hasVoted?.hasVoted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium" data-testid="text-voted-indicator">You have voted</span>
            </div>
          )}
          
          <Link href={`/poll/${poll.id}/results`}>
            <Button variant="outline" size="lg" data-testid="button-view-results">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Results
            </Button>
          </Link>
        </div>

        {/* Poll Options Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5" />
              Poll Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {poll.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-3 p-4 border border-border rounded-lg">
                  <Badge variant="outline" className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span className="text-foreground font-medium" data-testid={`text-option-${index}`}>
                    {option.text}
                  </span>
                </div>
              ))}
            </div>
            
            {isActive && !hasVoted?.hasVoted && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Ready to vote?</p>
                    <p>This poll uses secure encryption. Your vote is private and cannot be traced back to you.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owner Actions */}
        {isOwner && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Poll Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Link href={`/poll/${poll.id}/results`}>
                  <Button variant="outline" data-testid="button-manage-results">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Detailed Results
                  </Button>
                </Link>
                {/* Add more management options here */}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
