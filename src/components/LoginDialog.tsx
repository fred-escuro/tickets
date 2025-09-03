import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AuthService, setupTokenRefresh } from '@/lib/services/authService';
import { toast } from 'sonner';
import { LogIn, User, Lock } from 'lucide-react';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await AuthService.login(credentials);
      
      if (response.success && response.data) {
        // Store auth data
        AuthService.setAuthToken(response.data.token);
        AuthService.setCurrentUser(response.data.user);
        
        // Setup token refresh system
        setupTokenRefresh();
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('auth-change'));
        
        toast.success(`Welcome back, ${response.data.user.middleName ? `${response.data.user.firstName} ${response.data.user.middleName} ${response.data.user.lastName}` : `${response.data.user.firstName} ${response.data.user.lastName}`}!`);
        onLoginSuccess();
        onClose();
        
        // Reset form
        setCredentials({ email: '', password: '' });
      } else {
        toast.error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'admin' | 'agent' | 'user') => {
    const demoCredentials = {
      admin: { email: 'admin@tickethub.com', password: 'password123' },
      agent: { email: 'agent@tickethub.com', password: 'password123' },
      user: { email: 'user@tickethub.com', password: 'password123' }
    };

    setCredentials(demoCredentials[type]);
    setIsLoading(true);
    
    try {
      const response = await AuthService.login(demoCredentials[type]);
      
      if (response.success && response.data) {
        AuthService.setAuthToken(response.data.token);
        AuthService.setCurrentUser(response.data.user);
        
        // Setup token refresh system
        setupTokenRefresh();
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('auth-change'));
        
        toast.success(`Welcome back, ${response.data.user.middleName ? `${response.data.user.firstName} ${response.data.user.middleName} ${response.data.user.lastName}` : `${response.data.user.firstName} ${response.data.user.lastName}`}!`);
        onLoginSuccess();
        onClose();
        
        setCredentials({ email: '', password: '' });
      } else {
        toast.error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Login to Create Tickets
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        
        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center">
            Or use demo credentials:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoading}
            >
              Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoLogin('agent')}
              disabled={isLoading}
            >
              Agent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoLogin('user')}
              disabled={isLoading}
            >
              User
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
