import React, { useState, useEffect } from 'react';
import { SessionWarningDialog } from './SessionWarningDialog';
import { AuthService } from '@/lib/services/authService';
import { idleTimeoutService } from '@/lib/services/idleTimeoutService';
import { toast } from 'sonner';

export const SessionManager: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    // Listen for session warning events
    const handleSessionWarning = () => {
      const status = idleTimeoutService.getSessionStatus();
      setTimeRemaining(status.timeUntilIdle);
      setShowWarning(true);
    };

    // Listen for auth expired events
    const handleAuthExpired = () => {
      setShowWarning(false);
      toast.error('Your session has expired due to inactivity. Please log in again.');
    };

    window.addEventListener('session-warning', handleSessionWarning);
    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      window.removeEventListener('session-warning', handleSessionWarning);
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const handleExtendSession = async () => {
    try {
      const success = await AuthService.extendSession();
      if (success) {
        setShowWarning(false);
        toast.success('Session extended successfully');
      } else {
        toast.error('Failed to extend session');
      }
    } catch (error) {
      console.error('Error extending session:', error);
      toast.error('Failed to extend session');
    }
  };

  const handleLogout = () => {
    setShowWarning(false);
    AuthService.logout();
    toast.info('You have been logged out');
  };

  return (
    <SessionWarningDialog
      isOpen={showWarning}
      timeRemaining={timeRemaining}
      onExtendSession={handleExtendSession}
      onLogout={handleLogout}
    />
  );
};
