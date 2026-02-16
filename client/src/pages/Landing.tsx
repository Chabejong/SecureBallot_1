import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleCreatePoll = () => {
    if (isAuthenticated) {
      navigate("/create");
    } else {
      navigate("/auth?redirect=/create");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 text-center lg:text-left">
              <div className="inline-flex items-center bg-white/10 rounded-full px-4 py-2 mb-6">
                <Shield className="w-4 h-4 text-secondary mr-2" />
                <span className="text-sm font-medium">
                  End-to-End Encrypted
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Secure Community Voting{" "}
                <span className="text-secondary">Made Simple</span>
              </h1>
              <p className="text-lg sm:text-xl mb-8 text-white/90 leading-relaxed">
                Empower your community with transparent, secure, and accessible
                voting. From local decisions to nationwide polls, Ballot Box
                ensures every voice is heard.
              </p>
              <div className="flex justify-center lg:justify-start">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 w-full sm:w-auto"
                  onClick={handleCreatePoll}
                  data-testid="button-create-poll"
                >
                  Create Your Poll
                </Button>
              </div>
            </div>
            <div className="order-1 lg:order-2 w-full max-w-md lg:max-w-none mx-auto">
              <img
                src="/ballot-box.png"
                alt="Democratic voting ballot box for secure community elections"
                className="rounded-2xl shadow-2xl w-full h-auto border-2 border-primary/20 object-cover"
              />
            </div>
          </div>
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
                <span className="text-xl font-bold text-foreground">
                  Ballot Box
                </span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                Empowering communities with secure, transparent, and accessible
                voting technology. Every voice matters, every vote counts.
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
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    How it Works
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Security
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    API Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Contact</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/how-it-works"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    data-testid="link-help-center"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@erwebservice.com"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    data-testid="link-contact-us"
                  >
                    info@erwebservice.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 text-center">
            <p className="text-muted-foreground text-sm">
              © 2024 Ballot Box. All rights reserved. Design by <a href="https://erwebservice.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">erwebservice</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
