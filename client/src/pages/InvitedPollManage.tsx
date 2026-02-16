import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, Upload, Plus, Trash2, Send, Clock, CheckCircle, 
  XCircle, Download, BarChart3, Mail, Phone, AlertCircle,
  FileText, Eye, EyeOff
} from "lucide-react";
import { INVITED_POLL_PRICING } from "@shared/schema";

export default function InvitedPollManage() {
  const [, params] = useRoute("/invited-poll/:id/manage");
  const pollId = params?.id || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<"email" | "phone">("email");

  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualVoters, setManualVoters] = useState<Array<{email?: string; phone?: string}>>([]);

  const { data: poll, isLoading: pollLoading } = useQuery({
    queryKey: ["/api/invited-polls", pollId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invited-polls/${pollId}`);
      return res.json();
    },
    enabled: !!pollId,
  });

  const { data: voters, isLoading: votersLoading, refetch: refetchVoters } = useQuery({
    queryKey: ["/api/invited-polls", pollId, "voters"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invited-polls/${pollId}/voters`);
      return res.json();
    },
    enabled: !!pollId,
  });

  const { data: participation } = useQuery({
    queryKey: ["/api/invited-polls", pollId, "participation"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invited-polls/${pollId}/participation`);
      return res.json();
    },
    enabled: !!pollId,
  });

  const addVotersMutation = useMutation({
    mutationFn: async (voterList: Array<{email?: string; phone?: string}>) => {
      const res = await apiRequest("POST", `/api/invited-polls/${pollId}/voters`, { voters: voterList });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Voters Added", description: `${data.voters.length} voters added successfully.` });
      setManualVoters([]);
      setManualEmail("");
      setManualPhone("");
      queryClient.invalidateQueries({ queryKey: ["/api/invited-polls", pollId, "voters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invited-polls", pollId, "participation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invited-polls", pollId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add voters", variant: "destructive" });
    },
  });

  const sendInvitationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/invited-polls/${pollId}/send-invitations`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitations Sent",
        description: `${data.sent} invitations sent successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invited-polls", pollId, "voters"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send invitations", variant: "destructive" });
    },
  });

  const deleteVoterMutation = useMutation({
    mutationFn: async (voterId: string) => {
      const res = await apiRequest("DELETE", `/api/invited-polls/${pollId}/voters/${voterId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Voter Removed", description: "Voter has been removed from the poll." });
      queryClient.invalidateQueries({ queryKey: ["/api/invited-polls", pollId, "voters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invited-polls", pollId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to remove voter", variant: "destructive" });
    },
  });

  const addManualVoter = () => {
    if (!manualEmail && !manualPhone) {
      toast({ title: "Error", description: "Please enter an email or phone number.", variant: "destructive" });
      return;
    }
    if (manualEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualEmail)) {
      toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setManualVoters(prev => [...prev, {
      email: manualEmail || undefined,
      phone: manualPhone || undefined,
    }]);
    setManualEmail("");
    setManualPhone("");
  };

  const removeManualVoter = (index: number) => {
    setManualVoters(prev => prev.filter((_, i) => i !== index));
  };

  const submitManualVoters = () => {
    if (manualVoters.length === 0) {
      toast({ title: "Error", description: "Please add at least one voter.", variant: "destructive" });
      return;
    }
    addVotersMutation.mutate(manualVoters);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string).replace(/^\ufeff/, '');
      const allLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

      if (allLines.length === 0) {
        toast({ title: "Error", description: "CSV file is empty.", variant: "destructive" });
        return;
      }

      const firstLine = allLines[0].toLowerCase().replace(/[^a-z]/g, '');
      const hasHeader = firstLine === "email" || firstLine === "phone" || firstLine.includes("email") || firstLine.includes("phone");
      const dataLines = hasHeader ? allLines.slice(1) : allLines;

      if (dataLines.length === 0) {
        toast({ title: "Error", description: "CSV file must have at least one data row.", variant: "destructive" });
        return;
      }

      const parsedVoters: Array<{email?: string; phone?: string}> = [];
      const errors: string[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const value = dataLines[i].replace(/^["']|["']$/g, '').trim();
        if (!value) continue;

        if (uploadType === "email") {
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            parsedVoters.push({ email: value });
          } else {
            errors.push(`Row ${i + 1}: Invalid email "${value}"`);
          }
        } else {
          const phone = value.replace(/[\s\-()]/g, '');
          if (phone.length >= 5) {
            parsedVoters.push({ phone });
          } else {
            errors.push(`Row ${i + 1}: Invalid phone "${value}"`);
          }
        }
      }

      if (errors.length > 0) {
        toast({
          title: "CSV Warnings",
          description: `${errors.length} rows skipped. ${parsedVoters.length} valid voters found.`,
          variant: "destructive",
        });
      }

      if (parsedVoters.length > 0) {
        addVotersMutation.mutate(parsedVoters);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = (type: "email" | "phone") => {
    let csv: string;
    let filename: string;
    if (type === "email") {
      csv = "email\njohn@example.com\njane@example.com\n";
      filename = "voter-email-template.csv";
    } else {
      csv = "phone\n+1234567890\n+0987654321\n";
      filename = "voter-phone-template.csv";
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentVoterCount = voters?.length || 0;
  const currentTier = INVITED_POLL_PRICING.find(
    t => currentVoterCount >= t.min && currentVoterCount <= t.max
  );
  const price = currentTier?.price || 0;

  const pollEnded = poll ? new Date() > new Date(poll.endDate) : false;
  const pendingInvitations = voters?.filter((v: any) => v.invitationStatus === "pending" && v.email)?.length || 0;

  if (pollLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse text-lg text-muted-foreground text-center">Loading poll...</div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <h2 className="text-xl font-bold">Poll not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold">{poll.title}</h1>
            <Badge variant={pollEnded ? "secondary" : "default"}>
              {pollEnded ? "Ended" : "Active"}
            </Badge>
          </div>
          {poll.description && <p className="text-muted-foreground">{poll.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Ends: {new Date(poll.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {poll.voterCount} voters
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {poll.votedCount} voted
            </span>
          </div>
        </div>

        <Tabs defaultValue="voters" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="voters">Voters</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="results" disabled={!pollEnded}>Results</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="voters" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload CSV
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Upload a list of voters from a CSV file</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 justify-center" onClick={() => downloadTemplate("email")}>
                    <Download className="w-4 h-4 mr-2" />
                    Email Template
                  </Button>
                  <Button variant="outline" className="flex-1 justify-center" onClick={() => downloadTemplate("phone")}>
                    <Download className="w-4 h-4 mr-2" />
                    Phone Template
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-indigo-700 hover:bg-indigo-800 text-white"
                    onClick={() => { setUploadType("email"); setTimeout(() => fileInputRef.current?.click(), 0); }}
                    disabled={addVotersMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {addVotersMutation.isPending && uploadType === "email" ? "Uploading..." : "Upload Emails"}
                  </Button>
                  <Button
                    className="flex-1 bg-indigo-700 hover:bg-indigo-800 text-white"
                    onClick={() => { setUploadType("phone"); setTimeout(() => fileInputRef.current?.click(), 0); }}
                    disabled={addVotersMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {addVotersMutation.isPending && uploadType === "phone" ? "Uploading..." : "Upload Phones"}
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Manually
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Type voter contacts one by one</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Email address"
                    value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)}
                    type="email"
                    className="flex-1"
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={manualPhone}
                    onChange={e => setManualPhone(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addManualVoter} size="icon" className="flex-shrink-0 bg-indigo-700 hover:bg-indigo-800 text-white h-10 w-10">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {manualVoters.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {manualVoters.map((v, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                        <div className="flex items-center gap-3">
                          {v.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{v.email}</span>}
                          {v.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone}</span>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeManualVoter(i)} className="h-6 w-6 p-0">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={submitManualVoters} className="w-full bg-indigo-700 hover:bg-indigo-800 text-white" disabled={addVotersMutation.isPending}>
                      {addVotersMutation.isPending ? "Adding..." : `Add ${manualVoters.length} Voter${manualVoters.length > 1 ? 's' : ''}`}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {pendingInvitations > 0 && (
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Send className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{pendingInvitations} pending invitation{pendingInvitations > 1 ? 's' : ''}</p>
                      <p className="text-sm text-muted-foreground">Send email invitations with unique voting links</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => sendInvitationsMutation.mutate()}
                    disabled={sendInvitationsMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendInvitationsMutation.isPending ? "Sending..." : "Send Invitations"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Voter List ({currentVoterCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {votersLoading ? (
                  <p className="text-muted-foreground">Loading voters...</p>
                ) : !voters || voters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No voters added yet. Upload a CSV or add voters manually.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {voters.map((voter: any) => (
                      <div key={voter.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            {voter.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground" />{voter.email}</span>}
                            {voter.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{voter.phone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {voter.hasVoted ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Voted
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="secondary">
                                {voter.invitationStatus === "sent" ? (
                                  <><Send className="w-3 h-3 mr-1" />Invited</>
                                ) : voter.invitationStatus === "failed" ? (
                                  <><XCircle className="w-3 h-3 mr-1" />Failed</>
                                ) : (
                                  <><Clock className="w-3 h-3 mr-1" />Pending</>
                                )}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteVoterMutation.mutate(voter.id)}
                                disabled={deleteVoterMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Poll Questions ({poll.questions?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {poll.questions?.map((question: any, qi: number) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <span className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                        {qi + 1}
                      </span>
                      {question.text}
                    </h3>
                    <div className="space-y-2 ml-9">
                      {question.options?.map((opt: any, oi: number) => (
                        <div key={opt.id} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-5 h-5 border rounded flex items-center justify-center text-xs">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            {pollEnded ? (
              <InvitedPollResultsTab pollId={pollId} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <EyeOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Results Hidden</h3>
                  <p className="text-muted-foreground">Results will be available after the poll ends on {new Date(poll.endDate).toLocaleDateString()}.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing Tiers</CardTitle>
                <CardDescription>Cost is based on the number of invited voters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {INVITED_POLL_PRICING.map((tier) => (
                    <div
                      key={tier.min}
                      className={`border rounded-lg p-4 text-center ${
                        currentVoterCount >= tier.min && currentVoterCount <= tier.max
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : ""
                      }`}
                    >
                      <div className="text-2xl font-bold text-primary">€{tier.price}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {tier.min} - {tier.max} voters
                      </div>
                      {currentVoterCount >= tier.min && currentVoterCount <= tier.max && (
                        <Badge className="mt-2">Current Tier</Badge>
                      )}
                    </div>
                  ))}
                </div>
                {currentVoterCount > 0 && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Current voters: <strong>{currentVoterCount}</strong></p>
                    <p className="text-lg font-bold mt-1">Total Cost: €{price}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InvitedPollResultsTab({ pollId }: { pollId: string }) {
  const { data: results, isLoading } = useQuery({
    queryKey: ["/api/invited-polls", pollId, "results"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invited-polls/${pollId}/results`);
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading results...</div>;
  }

  if (!results || !results.results) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No results available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const exportCSV = () => {
    let csv = "Question,Option,Votes,Percentage\n";
    results.results.forEach((q: any) => {
      q.options.forEach((opt: any) => {
        csv += `"${q.questionText}","${opt.text}",${opt.voteCount},${opt.percentage}%\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poll-results-${pollId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Poll Results
        </h3>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{results.voterCount}</div>
            <div className="text-sm text-muted-foreground">Total Invited</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{results.votedCount}</div>
            <div className="text-sm text-muted-foreground">Voted</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{results.voterCount - results.votedCount}</div>
            <div className="text-sm text-muted-foreground">Did Not Vote</div>
          </Card>
        </div>
      </div>

      {results.results.map((question: any, qi: number) => (
        <Card key={question.questionId}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                {qi + 1}
              </span>
              {question.questionText}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {question.options.map((opt: any) => (
                <div key={opt.optionId} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{opt.text}</span>
                    <span className="font-medium">{opt.voteCount} vote{opt.voteCount !== 1 ? 's' : ''} ({opt.percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${opt.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
