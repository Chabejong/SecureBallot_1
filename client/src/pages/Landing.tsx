import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Shield, CheckCircle, LogIn, Info, Tag } from "lucide-react";
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
    <>
      {/* ── MOBILE: single-screen static layout ── */}
      <div className="flex flex-col h-screen overflow-hidden md:hidden bg-background">
        <Header />

        {/* Hero fills remaining height */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-secondary text-white px-6 text-center">
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 mb-4">
            <Shield className="w-3 h-3 mr-1.5" />
            <span className="text-xs font-medium">End-to-End Encrypted</span>
          </div>

          <img
            src="/ballot-box.png"
            alt="Ballot Box - Secure Community Voting"
            className="w-28 h-28 rounded-2xl shadow-2xl object-cover border-2 border-white/20 mb-4"
          />

          <h1 className="text-3xl font-bold mb-3 leading-tight">
            Secure Community Voting{" "}
            <span className="text-yellow-300">Made Simple</span>
          </h1>

          <p className="text-sm text-white/85 mb-6 max-w-xs leading-relaxed">
            Empower your community with transparent, secure, and accessible
            voting. Every voice is heard.
          </p>

          <Button
            size="lg"
            className="cta-create-poll border-0 px-8 py-3 text-base rounded-xl w-full max-w-xs mb-4"
            onClick={handleCreatePoll}
            data-testid="button-create-poll"
          >
            Create Your Poll
          </Button>

          <button
            onClick={() => navigate("/auth")}
            className="text-white/70 text-sm underline underline-offset-2"
          >
            Sign in
          </button>
        </div>

        {/* Mini footer */}
        <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            © 2024 Ballot Box
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/how-it-works")}
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-primary"
            >
              <Info className="w-3 h-3" />
              How it works
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-primary"
            >
              <Tag className="w-3 h-3" />
              Pricing
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: original scrollable layout ── */}
      <div className="hidden md:block min-h-screen bg-background">
        <Header />

        <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 text-center lg:text-left">
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
                    className="cta-create-poll border-0 px-8 py-4 text-lg rounded-xl w-full sm:w-auto"
                    onClick={handleCreatePoll}
                    data-testid="button-create-poll-desktop"
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
                <div className="inline-flex items-center bg-gradient-to-r from-secondary to-primary text-white rounded-full px-4 py-2">
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">End-to-End Encrypted</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-4">Platform</h3>
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
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-4">Contact</h3>
                <ul className="space-y-2">
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
                © 2024 Ballot Box. All rights reserved. Design by{" "}
                <a
                  href="https://erwebservice.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  erwebservice
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
