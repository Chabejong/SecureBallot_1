import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Shield, Menu, LogOut, User, Plus, X, UserPlus, BarChart3, Sparkles } from "lucide-react";
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to landing page after successful logout
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

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" aria-label="Home - CN³M The Ballot Box">
            <div className="flex items-center space-x-3 cursor-pointer" data-testid="link-home">
              <img 
                src={cn3mLogo} 
                alt="CN³M logo" 
                className="h-12 w-auto" 
                data-testid="img-logo-cn3m"
              />
              <span className="text-xl font-bold text-foreground">
                The Ballot Box
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {isAuthenticated && (
              <>
                <Link href="/">
                  <Button variant="ghost" className="px-4 py-2 h-10 font-medium text-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-polls">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Polls
                  </Button>
                </Link>
                <Link href="/create">
                  <Button className="px-4 py-2 h-10 font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md hover:shadow-lg transition-all duration-200" data-testid="link-create">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                </Link>
              </>
            )}
            <Link href="/how-it-works">
              <Button variant="ghost" className="px-4 py-2 h-10 font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-how-it-works">
                <CheckCircle className="w-4 h-4 mr-2" />
                How it Works
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" className="px-4 py-2 h-10 font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-pricing">
                Pricing
              </Button>
            </Link>
            <Link href="/donate">
              <Button variant="ghost" className="px-4 py-2 h-10 font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200" data-testid="link-donate">
                Donate
              </Button>
            </Link>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center space-x-4">
            <Badge className="bg-gradient-to-r from-secondary to-primary text-white px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              Secure
            </Badge>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link href="/create">
                  <Button size="sm" className="hidden lg:flex bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md hover:shadow-lg transition-all duration-200" data-testid="button-create-poll">
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
                      <div className="flex flex-col space-y-1 leading-none">
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
              <div className="flex items-center space-x-2">
                <Link href="/auth">
                  <Button variant="outline" size="sm" data-testid="button-sign-in">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth?mode=register">
                  <Button size="sm" data-testid="button-sign-up">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5 text-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Secure Badge */}
                  <div className="mb-4">
                    <Badge className="bg-gradient-to-r from-secondary to-primary text-white px-3 py-1">
                      <Shield className="w-3 h-3 mr-1" />
                      Secure
                    </Badge>
                  </div>
                  
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
                        </div>
                      </div>
                      
                      {/* Navigation Links */}
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
