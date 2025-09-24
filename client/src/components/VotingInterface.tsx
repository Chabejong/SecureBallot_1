import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Shield, Vote, Clock, Users, Lock } from "lucide-react";
import type { PollWithDetails } from "@shared/schema";

interface VotingInterfaceProps {
  poll: PollWithDetails;
  selectedOptionId: string | string[];
  onOptionSelect: (optionId: string | string[]) => void;
  onVote: () => void;
  isSubmitting: boolean;
  hasVoted?: boolean;
}

export function VotingInterface({ 
  poll, 
  selectedOptionId, 
  onOptionSelect, 
  onVote, 
  isSubmitting,
  hasVoted = false
}: VotingInterfaceProps) {
  const endTime = format(new Date(poll.endDate), "MMMM d, h:mm a");

  return (
    <Card className="shadow-lg">
      <CardContent className="p-8">
        {/* Poll Information */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">Cast Your Vote</h1>
          <h2 className="text-xl font-semibold text-foreground mb-4" data-testid="text-voting-poll-title">
            {poll.title}
          </h2>
          <p className="text-muted-foreground mb-4">
            Choose your preferred option. Your vote is anonymous and encrypted.
          </p>
          {hasVoted && poll.allowVoteChanges && (
            <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-secondary font-medium">
                You have already voted in this poll. You can change your vote if needed.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1" data-testid="text-voting-time-remaining">
              <Clock className="w-4 h-4" />
              Ends at: {endTime}
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
          {poll.options.map((option, index) => {
            const isSelected = poll.isMultipleChoice 
              ? Array.isArray(selectedOptionId) && selectedOptionId.includes(option.id)
              : selectedOptionId === option.id;

            const handleOptionClick = () => {
              // Prevent option changes while submitting
              if (isSubmitting) return;
              
              if (poll.isMultipleChoice) {
                const currentSelection = Array.isArray(selectedOptionId) ? selectedOptionId : [];
                if (currentSelection.includes(option.id)) {
                  onOptionSelect(currentSelection.filter(id => id !== option.id));
                } else {
                  onOptionSelect([...currentSelection, option.id]);
                }
              } else {
                onOptionSelect(option.id);
              }
            };

            return (
              <div key={option.id} className="relative">
                <input
                  type={poll.isMultipleChoice ? "checkbox" : "radio"}
                  id={option.id}
                  name={poll.isMultipleChoice ? undefined : "vote"}
                  value={option.id}
                  checked={isSelected}
                  onChange={handleOptionClick}
                  className="peer sr-only"
                  data-testid={`${poll.isMultipleChoice ? 'checkbox' : 'radio'}-vote-option-${index}`}
                />
                <label
                  htmlFor={option.id}
                  className={`block w-full p-6 border rounded-lg transition-colors ${
                    isSubmitting 
                      ? 'cursor-not-allowed opacity-60 border-border' 
                      : `cursor-pointer hover:bg-muted/30 ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1" data-testid={`text-vote-option-${index}`}>
                        {option.text}
                      </h4>
                      {option.imageUrl && (
                        <img 
                          src={option.imageUrl} 
                          alt={option.text}
                          className="mt-2 max-w-full h-32 object-cover rounded"
                          data-testid={`image-vote-option-${index}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center">
                      {poll.isMultipleChoice ? (
                        <div className={`w-5 h-5 border-2 ${isSelected ? 'border-primary bg-primary' : 'border-primary'} rounded flex items-center justify-center`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-sm"></div>
                          )}
                        </div>
                      ) : (
                        <div className={`w-5 h-5 border-2 ${isSelected ? 'border-primary bg-primary' : 'border-primary'} rounded-full relative`}>
                          {isSelected && (
                            <div className="absolute inset-1 bg-white rounded-full"></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            );
          })}
        </div>

        {/* Voting Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={onVote}
            disabled={
              poll.isMultipleChoice 
                ? (!Array.isArray(selectedOptionId) || selectedOptionId.length === 0) || isSubmitting
                : !selectedOptionId || isSubmitting
            }
            className="flex-1"
            size="lg"
            data-testid="button-submit-vote"
          >
            <Vote className="w-4 h-4 mr-2" />
            {isSubmitting 
              ? (hasVoted ? "Updating Vote..." : "Submitting Vote...") 
              : (hasVoted ? "Change My Vote" : `Submit My Vote${poll.isMultipleChoice && Array.isArray(selectedOptionId) && selectedOptionId.length > 1 ? 's' : ''}`)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
