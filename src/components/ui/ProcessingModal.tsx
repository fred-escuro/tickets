import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  status?: 'processing' | 'success' | 'error' | 'warning';
  progress?: number; // 0-100
  showProgress?: boolean;
  allowClose?: boolean;
  autoCloseDelay?: number; // milliseconds
  onAutoClose?: () => void;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  onClose,
  title = 'Processing...',
  message = 'Please wait while we process your request.',
  status = 'processing',
  progress,
  showProgress = false,
  allowClose = false,
  autoCloseDelay,
  onAutoClose
}) => {
  const [internalProgress, setInternalProgress] = React.useState(0);

  // Auto-close functionality
  React.useEffect(() => {
    if (autoCloseDelay && (status === 'success' || status === 'error')) {
      const timer = setTimeout(() => {
        onAutoClose?.();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDelay, status, onAutoClose]);

  // Simulate progress if not provided
  React.useEffect(() => {
    if (status === 'processing' && showProgress && progress === undefined) {
      const interval = setInterval(() => {
        setInternalProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until completion
          return prev + Math.random() * 10;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [status, showProgress, progress]);

  const currentProgress = progress !== undefined ? progress : internalProgress;

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-8 w-8 text-yellow-500" />;
      default:
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const handleClose = () => {
    if (allowClose || status !== 'processing') {
      onClose?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md border-0 shadow-xl"
        onPointerDownOutside={(e) => {
          if (!allowClose || status === 'processing') {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!allowClose || status === 'processing') {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col items-center space-y-6 py-8">
          {/* Status Icon */}
          <div className={cn(
            "p-4 rounded-full border-2",
            getStatusColor()
          )}>
            {getStatusIcon()}
          </div>

          {/* Title and Message */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {message}
            </p>
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(currentProgress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-300 ease-out",
                    status === 'success' ? 'bg-green-500' :
                    status === 'error' ? 'bg-red-500' :
                    status === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  )}
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {status !== 'processing' && (
            <div className="flex gap-2">
              {status === 'success' && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                >
                  Continue
                </button>
              )}
              {status === 'error' && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                >
                  Close
                </button>
              )}
              {status === 'warning' && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors"
                >
                  Acknowledge
                </button>
              )}
            </div>
          )}

          {/* Processing Animation */}
          {status === 'processing' && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Processing your request...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { ProcessingModal };
export default ProcessingModal;
