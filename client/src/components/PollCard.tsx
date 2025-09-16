import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Users, BarChart3, Vote, Globe, User, UserCheck, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { PollWithDetails } from "@shared/schema";

interface PollCardProps {
  poll: PollWithDetails;
  showOwnership?: boolean;
}

export function PollCard({ poll, showOwnership = false }: PollCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deletePollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      return await apiRequest("DELETE", `/api/polls/${pollId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Poll deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/polls"] });
    },
    onError: (error) => {
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
        description: "Failed to delete poll. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm("Are you sure you want to delete this poll? This action cannot be undone.")) {
      deletePollMutation.mutate(poll.id);
    }
  };

  const isActive = poll.isActive && new Date() < new Date(poll.endDate);
  const endTime = format(new Date(poll.endDate), "MMMM d, h:mm a");

  const getPollTypeInfo = (type: string) => {
    switch (type) {
      case "public":
        return { icon: Globe, label: "Public Poll", color: "bg-secondary/10 text-secondary border-secondary/20" };
      case "members":
        return { icon: User, label: "Members Only", color: "bg-primary/10 text-primary border-primary/20" };
      case "invited":
        return { icon: UserCheck, label: "Invited Only", color: "bg-accent/10 text-accent border-accent/20" };
      default:
        return { icon: Globe, label: "Public Poll", color: "bg-secondary/10 text-secondary border-secondary/20" };
    }
  };

  const pollTypeInfo = getPollTypeInfo(poll.pollType);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className={pollTypeInfo.color}>
            <pollTypeInfo.icon className="w-3 h-3 mr-1" />
            {pollTypeInfo.label}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm" data-testid={`text-time-remaining-${poll.id}`}>
              {isActive ? `Ends at: ${endTime}` : `Ended at: ${endTime}`}
            </span>
            {showOwnership && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deletePollMutation.isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid={`button-delete-poll-${poll.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        <Link href={`/poll/${poll.id}`}>
          <div className="cursor-pointer">
            <h3 className="font-semibold text-foreground mb-3 hover:text-primary transition-colors" data-testid={`text-poll-title-${poll.id}`}>
              {poll.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2" data-testid={`text-poll-description-${poll.id}`}>
              {poll.description || "No description provided."}
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-muted-foreground text-sm">
                <Users className="w-4 h-4 mr-2" />
                <span data-testid={`text-vote-count-${poll.id}`}>{poll.voteCount} votes</span>
              </div>
              <div className="flex items-center text-muted-foreground text-sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                <span data-testid={`text-option-count-${poll.id}`}>{poll.options.length} options</span>
              </div>
            </div>
          </div>
        </Link>
        
        <div className="flex gap-2">
          {isActive ? (
            <Link href={`/poll/${poll.id}/vote`} className="flex-1">
              <Button className="w-full" data-testid={`button-vote-${poll.id}`}>
                <Vote className="w-4 h-4 mr-2" />
                Vote Now
              </Button>
            </Link>
          ) : (
            <Link href={`/poll/${poll.id}/results`} className="flex-1">
              <Button variant="outline" className="w-full" data-testid={`button-view-results-${poll.id}`}>
                <BarChart3 className="w-4 h-4 mr-2" />
                View Results
              </Button>
            </Link>
          )}
          
          <Link href={`/poll/${poll.id}`}>
            <Button variant="outline" size="sm" data-testid={`button-view-details-${poll.id}`}>
              Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
