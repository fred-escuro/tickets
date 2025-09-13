import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock } from 'lucide-react';

interface SessionWarningDialogProps {
  isOpen: boolean;
  timeRemaining: number; // in milliseconds
  onExtendSession: () => void;
  onLogout: () => void;
}

export const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  isOpen,
  timeRemaining,
  onExtendSession,
  onLogout,
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(timeRemaining / 1000));

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(Math.ceil(timeRemaining / 1000));
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeRemaining, onLogout]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (countdown / (timeRemaining / 1000)) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Session Expiring Soon</DialogTitle>
          </div>
          <DialogDescription>
            Your session will expire due to inactivity. You have{' '}
            <span className="font-semibold text-amber-600">
              {formatTime(countdown)}
            </span>{' '}
            remaining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Time remaining
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2"
              style={{
                '--progress-background': 'hsl(var(--amber-500))',
              } as React.CSSProperties}
            />
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p>
              To continue your session, click "Extend Session" below. 
              Otherwise, you will be automatically logged out.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            Logout Now
          </Button>
          <Button onClick={onExtendSession}>
            Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
