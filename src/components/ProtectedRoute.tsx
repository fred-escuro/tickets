import { useState, useEffect, type FC, type ReactNode } from 'react';
import { LoginDialog } from '@/components/LoginDialog';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { useAppTitle } from '@/hooks/useAppTitle';

interface ProtectedRouteProps {
  children: ReactNode;
  pageTitle?: string;
  // Optional RBAC requirements
  requireAnyRoleNames?: string[]; // e.g., ['admin','manager']
  requireAnyPermissionKeys?: string[]; // e.g., ['tickets:read']
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ 
  children, 
  pageTitle = "Welcome", 
  requireAnyRoleNames,
  requireAnyPermissionKeys
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);

  // Use the app title hook to set the page title with app name and company name
  useAppTitle(pageTitle);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth-token');
      const authed = !!token;
      setIsAuthenticated(authed);
      if (!authed) {
        setHasAccess(false);
        return;
      }
      // RBAC gate: if roles required, check against current user's roles
      if (requireAnyRoleNames && requireAnyRoleNames.length > 0) {
        try {
          // Expect current user payload stored by auth service
          const raw = localStorage.getItem('user');
          const current = raw ? JSON.parse(raw) : null;
          const roles = (current?.roles || []) as Array<{ role: { name: string } }>;
          const names = roles.map(r => (r?.role?.name || '').toLowerCase());
          const needed = requireAnyRoleNames.map(r => r.toLowerCase());
          const roleOk = needed.some(n => names.includes(n));
          if (!roleOk) {
            setHasAccess(false);
            return;
          }
        } catch {
          setHasAccess(false);
          return;
        }
      }

      // Permission gate: if permissions required, check against user.permissions
      if (requireAnyPermissionKeys && requireAnyPermissionKeys.length > 0) {
        try {
          const raw = localStorage.getItem('user');
          const current = raw ? JSON.parse(raw) : null;
          const perms: string[] = Array.isArray(current?.permissions) ? current.permissions : [];
          const needed = requireAnyPermissionKeys;
          setHasAccess(needed.some(p => perms.includes(p)));
        } catch {
          setHasAccess(false);
          return;
        }
      } else if (!requireAnyRoleNames) {
        // If neither roles nor permissions specified, allow
        setHasAccess(true);
      }
    };

    checkAuth();
    
    // Listen for storage changes (when login/logout happens in other tabs)
    window.addEventListener('storage', checkAuth);
    
    // Listen for custom auth events in the same tab
    const handleAuthChange = () => {
      console.log('ProtectedRoute: Auth change event received');
      checkAuth();
    };
    
    const handleAuthExpired = () => {
      console.log('ProtectedRoute: Auth expired event received');
      setIsAuthenticated(false);
      setShowLoginDialog(true);
    };
    
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('auth-expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('auth-expired', handleAuthExpired);
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
        <LoginDialog
          isOpen={showLoginDialog}
          onClose={() => setShowLoginDialog(true)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // RBAC denied state
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Access restricted</h2>
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show protected content when authenticated
  return <>{children}</>;
};
