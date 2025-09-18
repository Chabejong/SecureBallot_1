import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Globe, UserCheck, Camera, Calendar, Download, Smartphone, Trash2, Shield, QrCode, Share2 } from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" data-testid="text-page-title">
            How Our Polling App Works
          </h1>
          <p className="text-xl text-muted-foreground">
            Create polls in seconds and gather opinions effortlessly. Here's a step-by-step guide and an overview of our key features.
          </p>
        </div>

        <div className="space-y-8">
          {/* Section 1: Creating a Poll */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle className="w-6 h-6 text-primary" />
                1. Creating a Poll
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Start by signing in and clicking "Create New Poll." The process is simple and quick.
              </p>
              
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-3">Mandatory Fields:</h4>
                <p className="text-muted-foreground">
                  You must provide a <strong>Poll Question</strong> and at least <strong>two options</strong> for voters to choose from, plus an <strong>end date and time</strong>.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-3">Optional Settings:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg">
                    <Shield className="w-5 h-5 text-secondary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Anonymous Poll</p>
                      <p className="text-sm text-muted-foreground">Hide voter identities so everyone can vote freely and honestly.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Multiple Choices</p>
                      <p className="text-sm text-muted-foreground">Allow voters to select more than one option.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg md:col-span-2">
                    <Users className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Change Vote</p>
                      <p className="text-sm text-muted-foreground">Let voters change their answer after submitting it.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Poll Visibility */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="w-6 h-6 text-primary" />
                2. Poll Visibility: Who Can Vote?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Control who participates in your poll:
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    <Globe className="w-3 h-3 mr-1" />
                    Public Poll
                  </Badge>
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      Public polls can be shared with anyone using a unique shareable link. Voting is completely anonymous—no sign-in required. Perfect for gathering feedback from a wide audience via social media, email, or QR codes.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    <Share2 className="w-3 h-3 mr-1" />
                    Public Poll (Anonymous)
                  </Badge>
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      Enable "Anyone with link can vote" to create a shareable poll where people can vote without creating an account. Each device can vote once, and you'll get a unique link plus a downloadable QR code for easy sharing.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Users className="w-3 h-3 mr-1" />
                    Members Only
                  </Badge>
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      Only registered members of the app can vote. This helps ensure a more verified and controlled audience.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Invited Only
                  </Badge>
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      The most private option. Only specific people you invite via email or username can access and vote in the poll.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Sharing Your Poll */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Share2 className="w-6 h-6 text-primary" />
                3. Sharing Your Poll
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Make it easy for people to find and participate in your public polls:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <Share2 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Shareable Links</p>
                    <p className="text-sm text-muted-foreground">Every public poll gets a unique, easy-to-share URL that works on any device. No sign-up required for voters!</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <QrCode className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">QR Code Generation</p>
                    <p className="text-sm text-muted-foreground">Automatically generate and download QR codes for your polls. Perfect for posters, presentations, or events.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg md:col-span-2">
                  <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Duplicate Vote Prevention</p>
                    <p className="text-sm text-muted-foreground">Each device can only vote once per poll using advanced fingerprinting technology, ensuring fair and accurate results without requiring user accounts.</p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-primary mb-2">How to Enable Anonymous Voting:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>When creating your poll, toggle ON "Public Poll (Anyone with link can vote)"</li>
                      <li>After creating the poll, you'll see a confirmation page with your shareable link</li>
                      <li>Download the QR code or copy the link to share via social media, email, or messaging</li>
                      <li>Anyone with the link can vote immediately—no registration required!</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Special Features */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Camera className="w-6 h-6 text-primary" />
                4. Special Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Make your polls more engaging and functional:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Camera className="w-5 h-5 text-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Add Photos to Options</p>
                    <p className="text-sm text-muted-foreground">Make your poll visually appealing by adding an image to each option (e.g., "Which logo do you prefer?").</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Set an End Date/Auto-Close</p>
                    <p className="text-sm text-muted-foreground">Schedule your poll to close automatically at a specific date and time.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Download className="w-5 h-5 text-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Download Results</p>
                    <p className="text-sm text-muted-foreground">Once the poll ends, you can download the results as a CSV or JSON file for easy analysis and sharing.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Results Summary</p>
                    <p className="text-sm text-muted-foreground">View a clean, visual summary of the results with percentages and vote counts displayed in a chart.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg md:col-span-2">
                  <Trash2 className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Auto-Data Deletion</p>
                    <p className="text-sm text-muted-foreground">For your privacy, the entire poll and all its associated data are permanently deleted from our database 48 hours after the poll ends.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Accessibility */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Smartphone className="w-6 h-6 text-primary" />
                5. Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our app is fully responsive and works seamlessly on any device—whether you're using a phone, tablet, or computer. Create and vote on polls anytime, anywhere.
              </p>
              
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <p className="font-medium text-primary">Security & Privacy</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  All polls use secure encryption, your votes are private, and with our automatic data deletion feature, your information is protected throughout the entire process.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}