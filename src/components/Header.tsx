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
  Settings,
  Shield,
  Building2,
  Ticket,
  Bell,
  Wrench,
  Menu
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
  // Pinned/click state for collapsed sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === '1';
    } catch { return false; }
  });
  // Hover state to temporarily expand when collapsed
  const [sidebarHover, setSidebarHover] = useState(false);
  const [sectionCollapsed, setSectionCollapsed] = useState<{support: boolean; tools: boolean; settings: boolean}>(() => {
    try {
      const raw = localStorage.getItem('sidebar-sections');
      return raw ? JSON.parse(raw) : { support: false, tools: false, settings: false };
    } catch { return { support: false, tools: false, settings: false }; }
  });

  // Update authentication state when it changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth-token');
      const user = AuthService.getCurrentUser();
      
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
      checkAuth();
    };
    
    // Also check auth periodically to catch any missed events
    const interval = setInterval(checkAuth, 30000); // Check every 30 seconds instead of every second
    
    window.addEventListener('auth-change', handleAuthChange);
    
    // Also check on mount
    checkAuth();

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', handleAuthChange);
      clearInterval(interval);
    };
  }, []);
  // toggleSidebar replaced by inline setter

  const toggleSection = (key: 'support' | 'tools' | 'settings') => {
    const next = { ...sectionCollapsed, [key]: !sectionCollapsed[key] };
    setSectionCollapsed(next);
    try { localStorage.setItem('sidebar-sections', JSON.stringify(next)); } catch {}
  };

  // Keep main content aligned with sidebar width using ONLY pinned state
  // Hover expansion should not shift content to avoid blocking clicks during reflow
  useEffect(() => {
    try {
      const width = sidebarCollapsed ? '4rem' : '14rem';
      document.documentElement.style.setProperty('--sidebar-width', width);
    } catch {}
  }, [sidebarCollapsed]);

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
    { path: '/admin/users', label: 'User Management', icon: Shield },
  ];

  // Settings navigation
  const settingsNavItems = [
    { path: '/settings', label: 'General', icon: Building2 },
    { path: '/settings?tab=tickets', label: 'Tickets', icon: Ticket },
    { path: '/settings?tab=users', label: 'Users', icon: Users },
    { path: '/settings?tab=notifications', label: 'Notifications', icon: Bell },
  ];

  const effectiveCollapsed = sidebarCollapsed && !sidebarHover;
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="w-full px-3 sm:px-4 lg:px-4 flex h-16 items-center justify-between">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(prev => {
                const next = !prev;
                try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0'); } catch {}
                return next;
              })} className="h-9 w-9 hidden lg:inline-flex">
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="/ticket.ico" 
                alt="TicketHub Logo" 
                className="h-8 w-8 rounded-lg"
              />
              <span className="font-semibold text-lg">TicketHub</span>
            </Link>
          </div>

          {/* Welcome label aligned with main content */}
          {isAuthenticated && currentUser && (
            <div className="hidden lg:block flex-1 pl-18">
              <span className="text-sm sm:text-base font-medium text-muted-foreground">
                Welcome, {currentUser.middleName ? `${currentUser.firstName} ${currentUser.middleName} ${currentUser.lastName}` : `${currentUser.firstName} ${currentUser.lastName}`}
              </span>
            </div>
          )}

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

      {/* Top Navigation Bar (mobile/tablet) */}
      {isAuthenticated && (
        <div className="sticky top-16 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-2">
              {/* Main Navigation - horizontal (hidden on lg) */}
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
                      <Wrench className="h-4 w-4" />
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

                {/* Settings Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        location.pathname === '/settings'
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Settings</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    {settingsNavItems.map((item) => {
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

      {/* Sidebar Navigation (desktop) */}
      {isAuthenticated && (
        <aside 
          className={`hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] ${effectiveCollapsed ? 'w-16' : 'w-56'} border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-20 transition-[width] duration-200`}
          onMouseEnter={() => setSidebarHover(true)}
          onMouseLeave={() => setSidebarHover(false)}
        >
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-2 relative">
            {/* Core */}
            <div className="space-y-1">
              {coreNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {!effectiveCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>

            {/* Support */}
            <div className="pt-2">
              {!effectiveCollapsed && (
                <button type="button" onClick={() => toggleSection('support')} className="w-full flex items-center justify-between px-2 py-1.5 text-[12px] uppercase tracking-wide text-muted-foreground hover:text-foreground">
                  <span>Support</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${sectionCollapsed.support ? '-rotate-90' : ''}`} />
                </button>
              )}
              <div className={`space-y-1 ${sectionCollapsed.support && effectiveCollapsed ? 'hidden' : ''}`}> 
                {supportNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} className={`flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
                      <Icon className="h-4 w-4" />
                      {!effectiveCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Tools */}
            <div className="pt-2">
              {!effectiveCollapsed && (
                <button type="button" onClick={() => toggleSection('tools')} className="w-full flex items-center justify-between px-2 py-1.5 text-[12px] uppercase tracking-wide text-muted-foreground hover:text-foreground">
                  <span>Tools</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${sectionCollapsed.tools ? '-rotate-90' : ''}`} />
                </button>
              )}
              <div className={`space-y-1 ${sectionCollapsed.tools && effectiveCollapsed ? 'hidden' : ''}`}> 
                {managementNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} className={`flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
                      <Icon className="h-4 w-4" />
                      {!effectiveCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Settings */}
            <div className="pt-2">
              {!effectiveCollapsed && (
                <button type="button" onClick={() => toggleSection('settings')} className="w-full flex items-center justify-between px-2 py-1.5 text-[12px] uppercase tracking-wide text-muted-foreground hover:text-foreground">
                  <span>Settings</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${sectionCollapsed.settings ? '-rotate-90' : ''}`} />
                </button>
              )}
              <div className={`space-y-1 ${sectionCollapsed.settings && effectiveCollapsed ? 'hidden' : ''}`}> 
                {settingsNavItems.map((item) => {
                  const Icon = item.icon;
                  // active check using pathname startsWith for query params
                  const isActive = location.pathname === '/settings' && item.path.startsWith('/settings');
                  return (
                    <Link key={item.path} to={item.path} className={`flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
                      <Icon className="h-4 w-4" />
                      {!effectiveCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </aside>
      )}

      {/* Mobile greeting */}
      {/* {currentUser && (
        <div className="sm:hidden mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-3 pt-3 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <p className="text-sm text-muted-foreground">
            Welcome, {currentUser.middleName ? `${currentUser.firstName} ${currentUser.middleName} ${currentUser.lastName}` : `${currentUser.firstName} ${currentUser.lastName}`}
          </p>
        </div>
      )} */}
    </>
  );
};
