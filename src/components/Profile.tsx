import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthService } from '@/lib/services/authService';
import { UserService } from '@/lib/services/userService';
import { toast } from 'sonner';
import { 
  User, 
  Settings, 
  Bell, 
  HelpCircle, 
  LogOut, 
  Shield, 
  FileText,
  Heart,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { type FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Profile: FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(AuthService.getCurrentUser());
  const navigate = useNavigate();

  // Update authentication state when it changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth-token');
      setIsAuthenticated(!!token);
      
      if (token) {
        setCurrentUser(AuthService.getCurrentUser());
      } else {
        setCurrentUser(null);
      }
    };

    // Listen for storage changes (when login/logout happens in other tabs)
    window.addEventListener('storage', checkAuth);
    
    // Listen for custom auth events in the same tab
    const handleAuthChange = () => {
      console.log('Profile: Auth change event received');
      checkAuth();
    };
    
    window.addEventListener('auth-change', handleAuthChange);
    
    // Also check on mount
    checkAuth();

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const refreshUserData = async () => {
    try {
      if (currentUser) {
        const response = await UserService.getUser(currentUser.id);
        if (response.success && response.data) {
          const freshUser = response.data;
          AuthService.setCurrentUser(freshUser);
          setCurrentUser(freshUser);
          toast.success('Profile refreshed');
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const handleProfileAction = async (action: string) => {
    switch (action) {
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        console.log('Navigate to settings');
        // TODO: Implement navigation to settings page
        break;
      case 'notifications':
        console.log('Navigate to notifications');
        // TODO: Implement navigation to notifications page
        break;
      case 'privacy':
        console.log('Navigate to privacy settings');
        // TODO: Implement navigation to privacy page
        break;
      case 'help':
        console.log('Navigate to help center');
        // TODO: Implement navigation to help page
        break;
      case 'feedback':
        console.log('Navigate to feedback');
        // TODO: Implement feedback form
        break;
      case 'docs':
        console.log('Navigate to documentation');
        // TODO: Implement navigation to docs
        break;
      case 'support':
        console.log('Navigate to support');
        // TODO: Implement navigation to support
        break;
      case 'logout':
        console.log('Logout user');
        
        // Logout and clear all auth data
        await AuthService.logout();
        toast.success('Logged out successfully');
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('auth-change'));
        
        // Redirect to root URL
        window.location.href = '/';
        break;
      default:
        break;
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full p-0 hover:bg-accent"
          aria-label="Profile menu"
        >
          <Avatar
            src={currentUser.avatar || undefined}
            alt={`${currentUser.middleName ? `${currentUser.firstName} ${currentUser.middleName} ${currentUser.lastName}` : `${currentUser.firstName} ${currentUser.lastName}`}'s avatar`}
            fallback={`${currentUser.firstName} ${currentUser.lastName}`}
            size="md"
            className="border-2 border-border hover:border-primary transition-colors"
            showInitials={true}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.middleName ? `${currentUser.firstName} ${currentUser.middleName} ${currentUser.lastName}` : `${currentUser.firstName} ${currentUser.lastName}`}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.role === 'admin' ? 'System Administrator' : currentUser.role}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.department || 'IT'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Account Section */}
        <DropdownMenuItem 
          onClick={() => handleProfileAction('profile')}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>View Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={refreshUserData}
          className="cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Refresh Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleProfileAction('settings')}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleProfileAction('notifications')}
          className="cursor-pointer"
        >
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleProfileAction('privacy')}
          className="cursor-pointer"
        >
          <Shield className="mr-2 h-4 w-4" />
          <span>Privacy & Security</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Support Section */}
        <DropdownMenuItem 
          onClick={() => handleProfileAction('help')}
          className="cursor-pointer"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help Center</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleProfileAction('docs')}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Documentation</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleProfileAction('feedback')}
          className="cursor-pointer"
        >
          <Heart className="mr-2 h-4 w-4" />
          <span>Send Feedback</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleProfileAction('support')}
          className="cursor-pointer"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Contact Support</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Logout */}
        <DropdownMenuItem 
          onClick={() => handleProfileAction('logout')}
          className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
