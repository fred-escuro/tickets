import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { config } from '@/config/environment';
import { AuthService, setupTokenRefresh } from '@/lib/services/authService';
import { toast } from 'sonner';
import { User, Lock } from 'lucide-react';

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
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

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

  const handleForgotPassword = async () => {
    if (!credentials.email) {
      toast.error('Enter your email first');
      return;
    }
    setIsSubmittingForgot(true);
    try {
      const res = await AuthService.forgotPassword(credentials.email);
      if (res.success) {
        toast.success('If the email exists, a reset link has been sent');
        // In development, show the token for quick testing
        if (res.data?.resetToken && config.app.environment !== 'production') {
          navigator.clipboard.writeText(res.data.resetToken).catch(() => {});
          toast.message('Reset token copied to clipboard for testing');
        }
      } else {
        toast.error(res.error || 'Failed to request reset');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to request reset');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const handleResendVerification = async () => {
    const email = isRegister ? registerData.email : credentials.email;
    if (!email) {
      toast.error('Enter your email first');
      return;
    }
    try {
      const res = await AuthService.requestEmailVerification(email);
      if (res.success) {
        toast.success('Verification email sent (if account exists)');
      } else {
        toast.error(res.error || 'Failed to send verification');
      }
    } catch (e) {
      toast.error('Failed to send verification');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.firstName || !registerData.lastName || !registerData.email || !registerData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await AuthService.register({
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        email: registerData.email,
        password: registerData.password,
      } as any);
      if (res.success && res.data) {
        toast.success('Registration successful. Please check your email to verify your account.');
        // Optionally auto-login after register if backend returns tokens
        AuthService.setAuthToken(res.data.token);
        AuthService.setCurrentUser(res.data.user);
        setupTokenRefresh();
        window.dispatchEvent(new Event('auth-change'));
        onLoginSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Use Google Identity Services One Tap or popup if available in host app
      // For now, check for global google.accounts.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g: any = (window as any).google;
      if (!g?.accounts?.id) {
        toast.error('Google login not available');
        return;
      }
      await new Promise<void>((resolve, reject) => {
        try {
          g.accounts.id.initialize({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, callback: async (response: any) => {
            if (!response?.credential) {
              reject(new Error('No credential'));
              return;
            }
            const res = await AuthService.socialLoginGoogle(response.credential);
            if (res.success && res.data) {
              AuthService.setAuthToken(res.data.token);
              AuthService.setCurrentUser(res.data.user);
              setupTokenRefresh();
              window.dispatchEvent(new Event('auth-change'));
              toast.success(`Welcome, ${res.data.user.firstName}!`);
              onLoginSuccess();
              onClose();
              resolve();
            } else {
              toast.error(res.error || 'Google login failed');
              reject(new Error(res.error || 'Google login failed'));
            }
          }});
          g.accounts.id.prompt();
        } catch (e) {
          reject(e);
        }
      });
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Google login failed');
    }
  };

  const handleDemoLogin = async (type: 'admin' | 'agent' | 'user') => {
    // Match seeded users and passwords from backend seed scripts
    const demoCredentials = {
      admin: { email: 'admin@company.com', password: 'admin123' },
      agent: { email: 'john.support@company.com', password: 'agent123' },
      user: { email: 'alice.user@company.com', password: 'user123' }
    } as const;

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
          <DialogTitle className="flex items-center gap-3">
            <img src="/ticket.ico" alt={config.app.name} className="h-6 w-6 rounded" />
            <span className="font-semibold">{config.app.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        {isRegister ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={registerData.firstName} onChange={(e) => setRegisterData(d => ({ ...d, firstName: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={registerData.lastName} onChange={(e) => setRegisterData(d => ({ ...d, lastName: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="regEmail">Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="regEmail" type="email" placeholder="Enter your email" value={registerData.email} onChange={(e) => setRegisterData(d => ({ ...d, email: e.target.value }))} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPassword">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="regPassword" type="password" placeholder="Create a password" value={registerData.password} onChange={(e) => setRegisterData(d => ({ ...d, password: e.target.value }))} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        ) : (
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
        )}
        
        <div className="space-y-3 pt-4">
          <Separator />
          <div className="flex items-center justify-center">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsRegister(v => !v)}>
              {isRegister ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={handleForgotPassword} disabled={isSubmittingForgot}>
              {isSubmittingForgot ? 'Sending…' : 'Forgot password?'}
            </Button>
            <Button type="button" variant="outline" onClick={handleResendVerification}>
              Resend verification
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={handleGoogleLogin} className="w-full">
            Continue with Google
          </Button>
          {!isRegister && (
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer">Use demo credentials</summary>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleDemoLogin('admin')} disabled={isLoading}>Admin</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDemoLogin('agent')} disabled={isLoading}>Agent</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDemoLogin('user')} disabled={isLoading}>User</Button>
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
