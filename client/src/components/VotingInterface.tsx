import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Shield, Vote, Clock, Users, Lock } from "lucide-react";
import type { PollWithDetails } from "@shared/schema";

interface VotingInterfaceProps {
  poll: PollWithDetails;
  selectedOptionId: string;
  onOptionSelect: (optionId: string) => void;
  onVote: () => void;
  isSubmitting: boolean;
}

export function VotingInterface({ 
  poll, 
  selectedOptionId, 
  onOptionSelect, 
  onVote, 
  isSubmitting 
}: VotingInterfaceProps) {
  const timeRemaining = formatDistanceToNow(new Date(poll.endDate), { addSuffix: true });

  return (
    <Card className="shadow-lg">
      <CardContent className="p-8">
        {/* Security Indicator */}
        <div className="flex items-center justify-center mb-8">
          <Badge className="bg-gradient-to-r from-secondary to-primary text-white px-4 py-2">
            <Shield className="w-4 h-4 mr-2" />
            Secure Voting Session
          </Badge>
        </div>

        {/* Poll Information */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-voting-poll-title">
            {poll.title}
          </h1>
          <p className="text-muted-foreground mb-4">
            {poll.description || "Choose your preferred option. Your vote is anonymous and encrypted."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1" data-testid="text-voting-time-remaining">
              <Clock className="w-4 h-4" />
              {timeRemaining}
            </span>
            <span className="flex items-center gap-1" data-testid="text-voting-participant-count">
              <Users className="w-4 h-4" />
              {poll.voteCount} participants
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-4 h-4" />
              {poll.isAnonymous ? "Anonymous" : "Verified"}
            </span>
          </div>
        </div>

        {/* Voting Options */}
        <div className="space-y-4 mb-8">
          {poll.options.map((option, index) => (
            <div key={option.id} className="relative">
              <input
                type="radio"
                id={option.id}
                name="vote"
                value={option.id}
                checked={selectedOptionId === option.id}
                onChange={() => onOptionSelect(option.id)}
                className="peer sr-only"
                data-testid={`radio-vote-option-${index}`}
              />
              <label
                htmlFor={option.id}
                className="block w-full p-6 border border-border rounded-lg cursor-pointer hover:bg-muted/30 peer-checked:border-primary peer-checked:bg-primary/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1" data-testid={`text-vote-option-${index}`}>
                      {option.text}
                    </h4>
                  </div>
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-primary rounded-full peer-checked:bg-primary peer-checked:border-primary relative">
                      {selectedOptionId === option.id && (
                        <div className="absolute inset-1 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Voting Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={onVote}
            disabled={!selectedOptionId || isSubmitting}
            className="flex-1"
            size="lg"
            data-testid="button-submit-vote"
          >
            <Vote className="w-4 h-4 mr-2" />
            {isSubmitting ? "Submitting Vote..." : "Submit My Vote"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
