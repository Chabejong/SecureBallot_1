import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, XCircle, Download, Users } from "lucide-react";
import { format } from "date-fns";
import type { PollWithDetails } from "@shared/schema";

interface AuthNumberStatus {
  authNumber: number;
  isUsed: boolean;
  usedAt?: Date;
}

interface ParticipationReport {
  pollId: string;
  totalNumbers: number;
  usedCount: number;
  unusedCount: number;
  authNumbers: AuthNumberStatus[];
}

export default function ParticipationReport() {
  const { id } = useParams();

  const { data: poll, isLoading: pollLoading } = useQuery({
    queryKey: [`/api/polls/${id}`],
    enabled: !!id,
    select: (data): PollWithDetails => data as PollWithDetails,
  });

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: [`/api/polls/${id}/participation-report`],
    enabled: !!id,
    select: (data): ParticipationReport => data as ParticipationReport,
  });

  const handleExportCSV = () => {
    if (!report || !poll) return;

    const csvContent = [
      ['Authentication Number', 'Status', 'Used At'],
      ...report.authNumbers.map(num => [
        num.authNumber.toString(),
        num.isUsed ? 'Used' : 'Unused',
        num.usedAt ? format(new Date(num.usedAt), 'yyyy-MM-dd HH:mm:ss') : '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participation-report-${poll.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (pollLoading || reportLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!poll || !report) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Report Not Available</h2>
              <p className="text-muted-foreground mb-4">
                The participation report is not available for this poll.
              </p>
              <Link href={`/poll/${id}`}>
                <Button>Back to Poll</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const participationRate = ((report.usedCount / report.totalNumbers) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href={`/poll/${id}`}>
            <Button variant="outline" data-testid="button-back">
              ← Back to Poll
            </Button>
          </Link>
        </div>

        {/* Report Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl mb-2">Participation Report</CardTitle>
                <p className="text-muted-foreground">{poll.title}</p>
              </div>
              <Button onClick={handleExportCSV} data-testid="button-export-csv">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Numbers</p>
                  <p className="text-2xl font-bold" data-testid="text-total-numbers">{report.totalNumbers}</p>
                </div>
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Used</p>
                  <p className="text-2xl font-bold text-secondary" data-testid="text-used-numbers">{report.usedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Unused</p>
                  <p className="text-2xl font-bold text-muted-foreground" data-testid="text-unused-numbers">{report.unusedCount}</p>
                </div>
                <XCircle className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participation Rate */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Participation Rate</span>
              <span className="text-sm font-bold" data-testid="text-participation-rate">{participationRate}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-secondary rounded-full h-3 transition-all duration-300" 
                style={{ width: `${participationRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Authentication Numbers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.authNumbers.map((num, index) => (
                <div 
                  key={num.authNumber} 
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    num.isUsed ? 'bg-secondary/5 border-secondary/20' : 'bg-muted/30 border-border'
                  }`}
                  data-testid={`row-auth-number-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <Badge variant={num.isUsed ? "default" : "outline"} className="w-20 justify-center">
                      #{num.authNumber}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {num.isUsed ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-secondary" />
                          <span className="text-sm font-medium text-secondary">Used</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Unused</span>
                        </>
                      )}
                    </div>
                  </div>
                  {num.usedAt && (
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(num.usedAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
