import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, Vote, Shield } from "lucide-react";

export default function InvitedVote() {
  const [, params] = useRoute("/invited-vote/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/invited-vote", token],
    queryFn: async () => {
      const res = await fetch(`/api/invited-vote/${token}`);
      const json = await res.json();
      if (!res.ok) {
        throw { ...json, status: res.status };
      }
      return json;
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (votes: Array<{ questionId: string; optionId: string }>) => {
      const res = await fetch(`/api/invited-vote/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit your vote",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!data?.poll?.questions) return;

    const missingAnswers = data.poll.questions.filter(
      (q: any) => !answers[q.id]
    );

    if (missingAnswers.length > 0) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    const votes = Object.entries(answers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));

    submitMutation.mutate(votes);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-pulse text-lg text-muted-foreground">Loading your ballot...</div>
      </div>
    );
  }

  if (error) {
    const err = error as any;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            {err.alreadyVoted ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Already Voted</h2>
                <p className="text-muted-foreground">You have already cast your vote in this poll. Each voter can only vote once.</p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">
                  {err.message === "This poll has ended" ? "Poll Ended" : "Invalid Link"}
                </h2>
                <p className="text-muted-foreground">{err.message || "This voting link is not valid."}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Vote Submitted!</h2>
            <p className="text-muted-foreground mb-4">Thank you for participating. Your vote has been recorded securely.</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Results will be available after the poll ends.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const poll = data?.poll;
  if (!poll) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-primary mb-4">
            <Vote className="w-6 h-6" />
            <span className="text-sm font-medium uppercase tracking-wider">Invited Poll</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{poll.title}</h1>
          {poll.description && (
            <p className="text-muted-foreground">{poll.description}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Voting ends: {new Date(poll.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="space-y-6">
          {poll.questions.map((question: any, qi: number) => (
            <Card key={question.id} className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {qi + 1}
                  </span>
                  <span>{question.text}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) =>
                    setAnswers((prev) => ({ ...prev, [question.id]: value }))
                  }
                >
                  <div className="space-y-3">
                    {question.options.map((option: any) => (
                      <div key={option.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="text-base cursor-pointer flex-1 py-2">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full py-6 text-lg"
            size="lg"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Your Vote"}
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Your vote is anonymous and secure. This link can only be used once.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
