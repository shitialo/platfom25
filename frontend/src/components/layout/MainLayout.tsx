import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Home, Menu, Utensils, Users, Facebook, Instagram, Twitter, Layers, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavbarSearch } from '../search/NavbarSearch';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sage-50 to-terracotta-50">
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white transform transition-transform group-hover:scale-105 duration-200">
                <Layers className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  Platform 2025
                </span>
                <span className="text-sm text-muted-foreground">Local Food & Stays</span>
              </div>
            </Link>
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <div className="flex items-center space-x-4">
              <NavbarSearch />
              <nav className="hidden md:flex items-center space-x-6">
                <Link 
                  to="/food" 
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <Utensils className="w-4 h-4" />
                  Local Food
                </Link>
                <Link 
                  to="/stays" 
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Stays
                </Link>
                {!loading && user?.is_host && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/host/dashboard')}
                  >
                    Host Dashboard
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {user ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full w-12 h-12 bg-purple-100 hover:bg-purple-200 transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.image || "/images/sarah.jpg"} />
                          <AvatarFallback className="bg-purple-500 text-white text-lg">
                            {user.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full w-12 h-12 bg-purple-100 hover:bg-purple-200 transition-colors"
                      >
                        <UserCircle className="w-7 h-7 text-purple-500" />
                      </Button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {user ? (
                      <>
                        <div className="px-2 py-1.5 text-sm font-medium">
                          {user.name}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/profile')}>
                          Your Profile
                        </DropdownMenuItem>
                        {!user.is_host && (
                          <DropdownMenuItem onClick={() => navigate('/become-host')}>
                            Become a Host
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                          Sign Out
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/login')}>
                          Sign In
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/signup')}>
                          Sign Up
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden flex flex-col space-y-4 pt-4 mt-4 border-t animate-fadeIn">
              <Link to="/food" className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                <Utensils className="w-4 h-4" />
                Local Food
              </Link>
              <Link to="/stays" className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                <Home className="w-4 h-4" />
                Stays
              </Link>
              {user ? (
                <>
                  <div className="px-4 py-2 flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.image || "/images/sarah.jpg"} />
                      <AvatarFallback className="bg-purple-500 text-white text-lg">
                        {user.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm font-medium">
                      {user.name}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate('/profile')}
                  >
                    Your Profile
                  </Button>
                  {user.is_host ? (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => navigate('/host/dashboard')}
                    >
                      Host Dashboard
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => navigate('/become-host')}
                    >
                      Become a Host
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="justify-start text-red-600 hover:text-red-700"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate('/login')}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate('/signup')}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">About Us</h3>
              <p className="text-sm text-muted-foreground">
                Connecting travelers with authentic local food experiences and unique stays around the world.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Host</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/host/food" className="nav-link">
                    Share your cuisine
                  </Link>
                </li>
                <li>
                  <Link to="/host/stay" className="nav-link">
                    Host your space
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/help" className="nav-link">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/safety" className="nav-link">
                    Safety Center
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="nav-link">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="nav-link">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Platform 2025. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;