import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2, QrCode, ExternalLink, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PollWithDetails } from "@shared/schema";

export default function PollConfirmation() {
  const [, params] = useRoute("/poll/:id/confirmation");
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const { data: poll, isLoading } = useQuery<PollWithDetails>({
    queryKey: [`/api/polls/${params?.id}`],
    enabled: !!params?.id,
  });

  // Generate shareable URL based on poll type
  const shareableUrl = poll?.shareableSlug 
    ? poll.isPublicShareable 
      ? `${window.location.origin}/vote/${poll.shareableSlug}` // Anonymous voting for public polls
      : `${window.location.origin}/auth/poll/${poll.shareableSlug}` // Authenticated access for members/invited polls
    : null;

  // Generate QR code
  useEffect(() => {
    if (shareableUrl) {
      QRCode.toDataURL(shareableUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('QR Code generation failed:', err));
    }
  }, [shareableUrl]);

  const copyToClipboard = async () => {
    if (shareableUrl) {
      try {
        await navigator.clipboard.writeText(shareableUrl);
        setCopied(true);
        toast({
          title: "Copied!",
          description: "Link copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  const shareViaWebShare = async () => {
    if (shareableUrl && navigator.share) {
      try {
        await navigator.share({
          title: poll?.title || "Vote on this poll",
          text: "Cast your vote anonymously on this poll",
          url: shareableUrl,
        });
      } catch (err) {
        // User cancelled or error occurred
        console.log("Sharing cancelled or failed");
      }
    } else {
      copyToClipboard();
    }
  };

  const downloadQrCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `poll-${poll?.title?.replace(/[^a-zA-Z0-9]/g, '_')}-qr.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!poll || !poll.shareableSlug || !shareableUrl) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Poll Not Found</h1>
            <p className="text-muted-foreground">This poll doesn't exist or doesn't have sharing enabled.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
              Poll Created Successfully!
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-2">
            {poll.isPublicShareable 
              ? "Your public poll is ready for anonymous voting"
              : poll.pollType === 'members'
                ? "Your members-only poll is ready for authenticated voting"
                : "Your invited-only poll is ready for authorized participants"
            }
          </p>
          <Badge variant="secondary" className="mb-4">
            <Share2 className="w-4 h-4 mr-1" />
            {poll.isPublicShareable 
              ? "Public Poll (Anonymous)"
              : poll.pollType === 'members'
                ? "Members Only Poll"
                : "Invited Only Poll"
            }
          </Badge>
        </div>

        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Share Your Poll
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Poll Details */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-lg mb-2" data-testid="text-poll-title">
                {poll.title}
              </h3>
              {poll.description && (
                <p className="text-muted-foreground" data-testid="text-poll-description">
                  {poll.description}
                </p>
              )}
            </div>

            {/* Shareable Link */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all border">
                  {shareableUrl}
                </div>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  data-testid="button-copy-link"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="text-center">
                <label className="text-sm font-medium text-foreground block mb-4">
                  QR Code
                </label>
                <div className="inline-block p-4 bg-white rounded-lg border shadow-sm">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code for poll voting"
                    className="mx-auto"
                    data-testid="img-qr-code"
                  />
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    onClick={downloadQrCode}
                    variant="outline"
                    size="sm"
                    data-testid="button-download-qr"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {poll.isPublicShareable 
                  ? "📢 Share this link or QR code for anyone to vote anonymously"
                  : poll.pollType === 'members'
                    ? "🔐 Share this link with registered members - they'll need to log in to vote"
                    : "🎯 Share this link with invited participants - they'll need to log in to vote"
                }
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {poll.isPublicShareable ? (
                  <>
                    <li>• No login or registration required for voters</li>
                    <li>• Each device can vote once (duplicate prevention enabled)</li>
                    <li>• Votes are completely anonymous</li>
                    <li>• Share via social media, email, or messaging apps</li>
                  </>
                ) : (
                  <>
                    <li>• Voters must be logged in to participate</li>
                    <li>• Each user can vote once per poll</li>
                    <li>• {poll.isAnonymous ? "Votes are anonymous" : "Votes are attributed to users"}</li>
                    <li>• Share via email or direct messaging for best results</li>
                    {poll.pollType === 'invited' && <li>• Only authorized participants can access this poll</li>}
                  </>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={shareViaWebShare}
                className="flex-1"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {'share' in navigator && typeof navigator.share === 'function' ? "Share Link" : "Copy Link"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(shareableUrl, '_blank')}
                data-testid="button-preview-poll"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview Poll
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center">
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}