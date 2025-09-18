import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, TrendingUp } from "lucide-react";
import type { PollWithResults } from "@shared/schema";

interface PollResultsProps {
  results: PollWithResults;
  "data-testid"?: string;
}

export function PollResults({ results, "data-testid": testId }: PollResultsProps) {
  const totalVotes = results.results.reduce((sum, result) => sum + result.voteCount, 0);
  const winningOption = results.results.reduce((winner, current) => 
    current.voteCount > winner.voteCount ? current : winner,
    results.results[0]
  );

  const endTime = new Date(results.endDate).toLocaleString();

  return (
    <div data-testid={testId}>
      {/* Results Display */}
      <div className="space-y-4 mb-6">
        {results.results.map((result, index) => (
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
                  <TrendingUp className="w-4 h-4 text-primary" />
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

      {/* Summary Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
        <span className="flex items-center gap-1" data-testid="text-total-votes">
          <Users className="w-4 h-4" />
          Total Votes: {totalVotes}
        </span>
        <span className="flex items-center gap-1" data-testid="text-poll-status">
          <Clock className="w-4 h-4" />
          Ended: {endTime}
        </span>
      </div>

      {/* Winner Summary */}
      {totalVotes > 0 && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-2" data-testid="text-winning-percentage">
              {winningOption.percentage}%
            </div>
            <p className="text-muted-foreground">
              Leading option: <span className="font-medium text-foreground" data-testid="text-winning-option">{winningOption.text}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}