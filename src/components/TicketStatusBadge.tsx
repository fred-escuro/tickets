import { Badge } from './ui/badge';
import { CheckCircle, EyeOff, Clock, AlertCircle, XCircle } from 'lucide-react';
import { ticketSystemService, type TicketStatus } from '@/lib/services/ticketSystemService';

interface TicketStatusBadgeProps {
  status: string | TicketStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  // Handle both string and TicketStatus objects with proper null checks
  const statusData = !status 
    ? { name: 'Unknown', color: 'gray', isClosed: false, isResolved: false }
    : typeof status === 'string' 
      ? { name: status, color: 'gray', isClosed: false, isResolved: false }
      : status;

  const getStatusIcon = () => {
    if (!showIcon || !statusData) return null;
    
    if (statusData.isClosed) {
      return <EyeOff className="h-3 w-3" />;
    }
    
    if (statusData.isResolved) {
      return <CheckCircle className="h-3 w-3" />;
    }

    // Default icons based on status name
    const statusName = statusData.name?.toLowerCase() || '';
    if (statusName.includes('open') || statusName.includes('new')) {
      return <AlertCircle className="h-3 w-3" />;
    }
    if (statusName.includes('progress') || statusName.includes('working')) {
      return <Clock className="h-3 w-3" />;
    }
    if (statusName.includes('pending') || statusName.includes('waiting')) {
      return <Clock className="h-3 w-3" />;
    }
    if (statusName.includes('blocked') || statusName.includes('stuck')) {
      return <XCircle className="h-3 w-3" />;
    }
    
    return null;
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-sm px-3 py-1.5';
      default:
        return 'text-sm px-2.5 py-1';
    }
  };

  const icon = getStatusIcon();
  const sizeClasses = getSizeClasses();

  // Additional safety check
  if (!statusData) {
    return (
      <Badge className={`${sizeClasses} ${className}`}>
        Unknown Status
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline"
      className={`${ticketSystemService.getStatusColorClass((statusData as any).color || 'gray')} ${sizeClasses} ${className} hover:brightness-95`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {statusData.name || 'Unknown'}
    </Badge>
  );
};
