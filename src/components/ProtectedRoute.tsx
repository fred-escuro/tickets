import { useState, useEffect, type FC, type ReactNode } from 'react';
import { LoginDialog } from '@/components/LoginDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, LogIn } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  pageTitle?: string;
  pageDescription?: string;
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ 
  children, 
  pageTitle = "Welcome", 
  pageDescription = "Please log in to access this page." 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth-token');
      setIsAuthenticated(!!token);
    };

    checkAuth();
    
    // Listen for storage changes (when login/logout happens in other tabs)
    window.addEventListener('storage', checkAuth);
    
    // Listen for custom auth events in the same tab
    const handleAuthChange = () => {
      console.log('ProtectedRoute: Auth change event received');
      checkAuth();
    };
    
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLoginDialog(false);
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{pageTitle}</h2>
                <p className="text-muted-foreground">{pageDescription}</p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => setShowLoginDialog(true)}
                  className="w-full"
                  size="lg"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                
                <div className="text-xs text-muted-foreground">
                  Demo Credentials:
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="p-2 bg-muted rounded text-left">
                    <strong>Admin:</strong> admin@company.com / admin123
                  </div>
                  <div className="p-2 bg-muted rounded text-left">
                    <strong>Agent:</strong> john.support@company.com / agent123
                  </div>
                  <div className="p-2 bg-muted rounded text-left">
                    <strong>User:</strong> alice.user@company.com / user123
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Dialog */}
        <LoginDialog
          isOpen={showLoginDialog}
          onClose={() => setShowLoginDialog(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // Show protected content when authenticated
  return <>{children}</>;
};
