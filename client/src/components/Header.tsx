import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Shield, Menu, LogOut, User, Plus, X } from "lucide-react";
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

  const handleLogout = () => {
    window.location.href = "/api/logout";
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
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer" data-testid="link-home">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">The Ballot Box</span>
            </div>
          </Link>

          {/* Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/">
                <a className="text-foreground hover:text-primary font-medium transition-colors" data-testid="link-polls">
                  Polls
                </a>
              </Link>
              <Link href="/create">
                <a className="text-muted-foreground hover:text-primary font-medium transition-colors" data-testid="link-create">
                  Create
                </a>
              </Link>
            </nav>
          )}

          {/* Auth Actions */}
          <div className="flex items-center space-x-4">
            <Badge className="bg-gradient-to-r from-secondary to-primary text-white px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              Secure
            </Badge>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link href="/create">
                  <Button variant="outline" size="sm" className="hidden sm:flex" data-testid="button-create-poll">
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
              <Button 
                className=""
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
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
                          <Button variant="ghost" className="w-full justify-start h-12" data-testid="link-mobile-polls">
                            <User className="w-4 h-4 mr-3" />
                            My Polls
                          </Button>
                        </Link>
                      </SheetClose>
                      
                      <SheetClose asChild>
                        <Link href="/create">
                          <Button variant="ghost" className="w-full justify-start h-12" data-testid="link-mobile-create">
                            <Plus className="w-4 h-4 mr-3" />
                            Create Poll
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
                    <SheetClose asChild>
                      <Button 
                        className="w-full h-12"
                        onClick={() => window.location.href = "/api/login"}
                        data-testid="button-mobile-sign-in"
                      >
                        Sign In
                      </Button>
                    </SheetClose>
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
