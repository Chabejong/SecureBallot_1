import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, ClipboardCheck, Smartphone, Globe, Lock, ShieldQuestion, CheckCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center bg-white/10 rounded-full px-4 py-2 mb-6">
                <Shield className="w-4 h-4 text-secondary mr-2" />
                <span className="text-sm font-medium">End-to-End Encrypted</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Secure Community Voting <span className="text-secondary">Made Simple</span>
              </h1>
              <p className="text-xl mb-8 text-white/90 leading-relaxed">
                Empower your community with transparent, secure, and accessible voting. From local decisions to nationwide polls, The Ballot Box ensures every voice is heard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-secondary text-white hover:bg-secondary/90"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-start-voting"
                >
                  Start Voting Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-create-poll"
                >
                  Create Your Poll
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <img 
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                alt="Community gathering for democratic voting" 
                className="rounded-2xl shadow-2xl w-full h-auto border-2 border-primary/20" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2" data-testid="text-encryption-title">256-bit Encryption</h3>
              <p className="text-muted-foreground text-sm">Bank-level security for all votes</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <ShieldQuestion className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2" data-testid="text-anonymous-title">Anonymous Voting</h3>
              <p className="text-muted-foreground text-sm">Your privacy is guaranteed</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <ClipboardCheck className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2" data-testid="text-audit-title">Audit Trail</h3>
              <p className="text-muted-foreground text-sm">Complete transparency</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2" data-testid="text-mobile-title">Mobile Ready</h3>
              <p className="text-muted-foreground text-sm">Vote from anywhere</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Voting Interface */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Sample Voting Interface</h2>
            <p className="text-xl text-muted-foreground">Experience our secure and intuitive voting process</p>
          </div>

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
                <h3 className="text-2xl font-bold text-foreground mb-2">Community Park Renovation Project</h3>
                <p className="text-muted-foreground mb-4">Choose your top priority for the renovation project. Your vote is anonymous and encrypted.</p>
                <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                  <span data-testid="text-time-remaining">⏱️ 2 days remaining</span>
                  <span data-testid="text-participant-count">👥 1,247 participants</span>
                  <span data-testid="text-anonymous-indicator">🔒 Anonymous</span>
                </div>
              </div>

              {/* Sample Voting Options */}
              <div className="space-y-4 mb-8">
                {[
                  { id: 1, title: "New Playground Equipment", desc: "Modern, accessible playground for children of all ages", percentage: 34 },
                  { id: 2, title: "Walking & Jogging Trails", desc: "Paved trails connecting all areas of the park", percentage: 28 },
                  { id: 3, title: "Community Garden", desc: "Space for residents to grow vegetables and flowers", percentage: 25 },
                  { id: 4, title: "Event Pavilion", desc: "Covered area for community events and gatherings", percentage: 13 }
                ].map((option) => (
                  <div key={option.id} className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{option.title}</h4>
                        <p className="text-muted-foreground text-sm">{option.desc}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-muted-foreground text-sm">{option.percentage}%</span>
                        <div className="w-4 h-4 border-2 border-primary rounded-full"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-sample-vote"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Sign In to Vote
                </Button>
                <Button 
                  variant="outline" 
                  className="px-8"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-view-results"
                >
                  View Results
                </Button>
              </div>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Your vote is secure and anonymous</p>
                    <p>This poll uses end-to-end encryption. Your vote cannot be traced back to you, and the results are verifiable through our public audit trail.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

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
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">How it Works</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Security</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">API Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
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
