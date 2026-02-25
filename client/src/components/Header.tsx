import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Shield, Menu, LogOut, User, Plus, X, UserPlus, BarChart3, Sparkles, Share2, Home } from "lucide-react";
import cn3mLogo from "@/assets/cn3m-logo.png";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useState } from "react";

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const navButtonClass = (path: string) =>
    isActive(path)
      ? "px-4 py-2 h-10 font-medium bg-primary text-white hover:bg-primary/90 transition-all duration-200"
      : "px-4 py-2 h-10 font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200";

  const handleShare = async () => {
    const shareData = {
      title: "Ballot Box - Secure Community Voting",
      text: "Check out Ballot Box for secure, transparent community voting!",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "The page link has been copied to your clipboard.",
        });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "The page link has been copied to your clipboard.",
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = '/landing';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getTierDisplayName = (tier: string) => {
    const tierMap: Record<string, string> = {
      free: "Free",
      basic: "Basic",
      standard: "Standard",
      premium: "Premium",
      professional: "Professional",
      enterprise: "Enterprise",
      ultimate: "Ultimate"
    };
    return tierMap[tier] || "Free";
  };

  const getTierColor = (tier: string) => {
    const colorMap: Record<string, string> = {
      free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      basic: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      standard: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      premium: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      professional: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
      enterprise: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      ultimate: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
    };
    return colorMap[tier] || colorMap.free;
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/landing" aria-label="Home - CN³M Ballot Box">
            <div className="flex items-center space-x-3 cursor-pointer" data-testid="link-home">
              <img 
                src={cn3mLogo} 
                alt="CN³M logo" 
                className="h-12 w-auto" 
                data-testid="img-logo-cn3m"
              />
              <span className="text-xl font-bold text-foreground">
                Ballot Box
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link href="/landing">
              <Button variant="ghost" className={navButtonClass("/landing")} data-testid="link-home">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/">
                  <Button variant="ghost" className={navButtonClass("/")} data-testid="link-polls">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Polls
                  </Button>
                </Link>
                <Link href="/create">
                  <Button variant="ghost" className={navButtonClass("/create")} data-testid="link-create">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                </Link>
              </>
            )}
            <Link href="/how-it-works">
              <Button variant="ghost" className={navButtonClass("/how-it-works")} data-testid="link-how-it-works">
                <CheckCircle className="w-4 h-4 mr-2" />
                How it Works
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" className={navButtonClass("/pricing")} data-testid="link-pricing">
                Pricing
              </Button>
            </Link>
            <Link href="/donate">
              <Button variant="ghost" className={navButtonClass("/donate")} data-testid="link-donate">
                Donate
              </Button>
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {/* Share Button - always visible */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                  onClick={handleShare}
                  data-testid="button-share"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share this page</p>
              </TooltipContent>
            </Tooltip>

            {/* Auth actions - hidden on mobile, shown in hamburger menu */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-2">
                <Link href="/create">
                  <Button size="sm" className="hidden lg:flex cta-create-poll border-0 rounded-lg" data-testid="button-create-poll">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Poll
                  </Button>
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none w-full">
                        {user?.firstName && (
                          <p className="font-medium" data-testid="text-user-name">
                            {user.firstName} {user.lastName}
                          </p>
                        )}
                        {user?.email && (
                          <p className="w-[200px] truncate text-sm text-muted-foreground" data-testid="text-user-email">
                            {user.email}
                          </p>
                        )}
                        {user?.subscriptionTier && (
                          <Badge 
                            className={`mt-2 w-fit text-xs ${getTierColor(user.subscriptionTier)}`}
                            data-testid="badge-subscription-tier"
                          >
                            {getTierDisplayName(user.subscriptionTier)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Polls</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/create">
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Create Poll</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Link href="/auth">
                  <Button size="sm" data-testid="button-sign-in">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth?mode=register">
                  <Button variant="outline" size="sm" data-testid="button-sign-up">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden h-10 w-10 p-0" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5 text-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {isAuthenticated ? (
                    <>
                      {/* User Info */}
                      <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          {user?.firstName && (
                            <p className="font-medium text-sm" data-testid="text-mobile-user-name">
                              {user.firstName} {user.lastName}
                            </p>
                          )}
                          {user?.email && (
                            <p className="text-xs text-muted-foreground truncate" data-testid="text-mobile-user-email">
                              {user.email}
                            </p>
                          )}
                          {user?.subscriptionTier && (
                            <Badge 
                              className={`mt-1 w-fit text-xs ${getTierColor(user.subscriptionTier)}`}
                              data-testid="badge-mobile-subscription-tier"
                            >
                              {getTierDisplayName(user.subscriptionTier)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Navigation Links */}
                      <SheetClose asChild>
                        <Link href="/landing">
                          <Button variant="ghost" className="w-full justify-start h-12 text-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-mobile-home">
                            <Home className="w-4 h-4 mr-3" />
                            Home
                          </Button>
                        </Link>
                      </SheetClose>

                      <SheetClose asChild>
                        <Link href="/">
                          <Button variant="ghost" className="w-full justify-start h-12 text-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-mobile-polls">
                            <BarChart3 className="w-4 h-4 mr-3" />
                            My Polls
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/create">
                          <Button className="w-full justify-start h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md transition-all duration-200" data-testid="link-mobile-create">
                            <Sparkles className="w-4 h-4 mr-3" />
                            Create Poll
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/how-it-works">
                          <Button variant="ghost" className="w-full justify-start h-12 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-mobile-how-it-works">
                            <CheckCircle className="w-4 h-4 mr-3" />
                            How it Works
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/pricing">
                          <Button variant="ghost" className="w-full justify-start h-12 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-mobile-pricing">
                            Pricing
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/donate">
                          <Button variant="ghost" className="w-full justify-start h-12 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-mobile-donate">
                            Donate
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <div className="pt-4 mt-4 border-t">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50" 
                          onClick={handleLogout}
                          data-testid="button-mobile-logout"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Log Out
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Link href="/landing">
                          <Button variant="ghost" className="w-full justify-start h-12" data-testid="link-mobile-home-guest">
                            <Home className="w-4 h-4 mr-3" />
                            Home
                          </Button>
                        </Link>
                      </SheetClose>

                      <SheetClose asChild>
                        <Link href="/how-it-works">
                          <Button variant="ghost" className="w-full justify-start h-12" data-testid="link-mobile-how-it-works-guest">
                            <CheckCircle className="w-4 h-4 mr-3" />
                            How it Works
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/pricing">
                          <Button variant="ghost" className="w-full justify-start h-12" data-testid="link-mobile-pricing-guest">
                            Pricing
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/donate">
                          <Button variant="ghost" className="w-full justify-start h-12" data-testid="link-mobile-donate-guest">
                            Donate
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/auth">
                          <Button 
                            className="w-full h-12"
                            data-testid="button-mobile-sign-in"
                          >
                            Sign In
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/auth?mode=register">
                          <Button 
                            variant="outline"
                            className="w-full h-12"
                            data-testid="button-mobile-sign-up"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Sign Up
                          </Button>
                        </Link>
                      </SheetClose>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
