import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthService } from '@/lib/services/authService';
import { 
  Home, 
  MessageSquare, 
  Users, 
  Calendar, 
  BarChart3, 
  FileText, 
  Headphones,
  ChevronDown,
  Settings
} from 'lucide-react';
import { type FC, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { Profile } from './Profile';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';

export const Header: FC = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(AuthService.getCurrentUser());

  // Update authentication state when it changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth-token');
      const user = AuthService.getCurrentUser();
      
      console.log('Header: Checking auth - Token:', !!token, 'User:', !!user);
      
      setIsAuthenticated(!!token);
      
      if (token) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    };

    // Listen for storage changes (when login/logout happens in other tabs)
    window.addEventListener('storage', checkAuth);
    
    // Listen for custom auth events in the same tab
    const handleAuthChange = () => {
      console.log('Header: Auth change event received');
      checkAuth();
    };
    
    // Also check auth periodically to catch any missed events
    const interval = setInterval(checkAuth, 1000);
    
    window.addEventListener('auth-change', handleAuthChange);
    
    // Also check on mount
    checkAuth();

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  // Core navigation items for ticketing system
  const coreNavItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/tickets', label: 'Tickets', icon: MessageSquare },
  ];

  // Support team navigation
  const supportNavItems = [
    { path: '/users', label: 'Users', icon: Users },
    { path: '/tasks', label: 'Tasks', icon: FileText },
  ];

  // Management & reporting navigation
  const managementNavItems = [
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/knowledge-base', label: 'Knowledge Base', icon: Headphones },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Left side - Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                T
              </div>
              <span className="font-semibold text-lg">TicketHub</span>
            </Link>
            {isAuthenticated && currentUser && (
              <div className="hidden sm:block">
                <span className="text-lg font-medium text-muted-foreground">
                  Welcome, {currentUser.middleName ? `${currentUser.firstName} ${currentUser.middleName} ${currentUser.lastName}` : `${currentUser.firstName} ${currentUser.lastName}`}
                </span>
              </div>
            )}
          </div>
          {/* Right side - Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <GlobalSearch />
            </div>
            <NotificationDropdown />
            <ThemeToggle />
            <Profile />
          </div>
        </div>
      </header>

      {/* Navigation Bar - Only show when authenticated */}
      {isAuthenticated && (
        <div className="sticky top-16 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-2">
              {/* Main Navigation - Cleaner with dropdowns */}
              <nav className="flex items-center gap-3">
                {/* Core Items - Always visible */}
                {coreNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  );
                })}

                {/* Support Team Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        supportNavItems.some(item => location.pathname === item.path)
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Support</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    {supportNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link
                            to={item.path}
                            className="flex items-center gap-2 w-full"
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Management & Tools Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        managementNavItems.some(item => location.pathname === item.path)
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Tools</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    {managementNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link
                            to={item.path}
                            className="flex items-center gap-2 w-full"
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Mobile greeting */}
      {currentUser && (
        <div className="sm:hidden mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-3 pt-3 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <p className="text-sm text-muted-foreground">
            Welcome, {currentUser.middleName ? `${currentUser.firstName} ${currentUser.middleName} ${currentUser.lastName}` : `${currentUser.firstName} ${currentUser.lastName}`}
          </p>
        </div>
      )}
    </>
  );
};
