import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { PollCard } from "@/components/PollCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Plus, TrendingUp, Users, BarChart3 } from "lucide-react";
import type { PollWithDetails } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  
  const { data: polls, isLoading: pollsLoading } = useQuery({
    queryKey: ["/api/polls"],
    select: (data): PollWithDetails[] => data,
  });

  const { data: userPolls, isLoading: userPollsLoading } = useQuery({
    queryKey: ["/api/user/polls"],
    select: (data): PollWithDetails[] => data,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-welcome">
                Welcome back, {user?.firstName || user?.email || 'Voter'}!
              </h1>
              <p className="text-muted-foreground">
                Participate in ongoing polls or create your own to engage your community.
              </p>
            </div>
            <Link href="/create">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-create-poll">
                <Plus className="w-4 h-4 mr-2" />
                Create Poll
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Active Polls</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-active-polls-count">
                      {polls?.filter(p => p.isActive && new Date() < new Date(p.endDate)).length || 0}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">My Polls</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-my-polls-count">
                      {userPolls?.length || 0}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Participants</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-participants">
                      {polls?.reduce((sum, poll) => sum + poll.voteCount, 0) || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Active Polls Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Active Polls</h2>
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
              <TrendingUp className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
          
          {pollsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-4 w-16 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : polls && polls.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {polls
                .filter(poll => poll.isActive && new Date() < new Date(poll.endDate))
                .slice(0, 6)
                .map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Polls</h3>
                <p className="text-muted-foreground mb-4">
                  There are no active polls at the moment. Why not create one?
                </p>
                <Link href="/create">
                  <Button data-testid="button-create-first-poll">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Poll
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {/* My Polls Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">My Polls</h2>
            <Link href="/create">
              <Button variant="outline" data-testid="button-create-another-poll">
                <Plus className="w-4 h-4 mr-2" />
                Create Another
              </Button>
            </Link>
          </div>
          
          {userPollsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-4 w-16 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userPolls && userPolls.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userPolls.slice(0, 6).map((poll) => (
                <PollCard key={poll.id} poll={poll} showOwnership />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Polls Created Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first poll to start engaging with your community.
                </p>
                <Link href="/create">
                  <Button data-testid="button-create-my-first-poll">
                    <Plus className="w-4 h-4 mr-2" />
                    Create My First Poll
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
