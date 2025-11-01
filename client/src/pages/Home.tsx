import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { PollCard } from "@/components/PollCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Plus, TrendingUp, Users, BarChart3, Shield, Lock, CheckCircle } from "lucide-react";
import type { PollWithDetails } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  
  const { data: userPolls, isLoading: userPollsLoading } = useQuery({
    queryKey: ["/api/user/polls"],
    select: (data): PollWithDetails[] => data as PollWithDetails[],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 break-words" data-testid="text-welcome">
                Welcome back, {user?.firstName || user?.email || 'Voter'}!
              </h1>
              <p className="text-muted-foreground">
                Participate in ongoing polls or create your own to engage your community.
              </p>
            </div>
            <Link href="/create" className="flex-shrink-0">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md hover:shadow-lg transition-all duration-200" data-testid="button-create-poll">
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
                    <p className="text-muted-foreground text-sm">Total Polls</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-polls-count">
                      {userPolls?.length || 0}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Active Polls</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-active-polls-count">
                      {userPolls?.filter(p => p.isActive && new Date() < new Date(p.endDate)).length || 0}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Votes</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-participants">
                      {userPolls?.reduce((sum, poll) => sum + poll.voteCount, 0) || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
              {userPolls.map((poll) => (
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

      {/* Footer */}
      <footer className="bg-card border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">The Ballot Box</span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                Empowering communities with secure, transparent, and accessible voting technology. 
                Every voice matters, every vote counts.
              </p>
              <div className="flex space-x-4">
                <Badge className="bg-gradient-to-r from-secondary to-primary text-white">
                  <Shield className="w-3 h-3 mr-1" />
                  SOC 2 Compliant
                </Badge>
                <Badge className="bg-gradient-to-r from-secondary to-primary text-white">
                  <Lock className="w-3 h-3 mr-1" />
                  256-bit Encryption
                </Badge>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><a href="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">How it Works</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Security</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">API Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Contact</h3>
              <ul className="space-y-2">
                <li><a href="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-help-center">Help Center</a></li>
                <li><a href="mailto:info@erwebservice.com" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-contact-us">info@erwebservice.com</a></li>
                <li className="text-muted-foreground text-sm pt-2">
                  Schenkendorfstr. 1<br />
                  51545 Waldbröl<br />
                  Germany
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 text-center">
            <p className="text-muted-foreground text-sm">
              © 2024 The Ballot Box. All rights reserved. Built with security and transparency in mind.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
