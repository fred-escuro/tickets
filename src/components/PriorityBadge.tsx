import { Badge } from './ui/badge';
import { AlertCircle, Clock, Zap, Flame, Star } from 'lucide-react';
import { type TicketPriority } from '@/lib/services/ticketSystemService';

interface PriorityBadgeProps {
  priority: string | TicketPriority;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  // Handle both string and TicketPriority objects with proper null checks
  const priorityData = !priority 
    ? { name: 'Unknown', color: 'gray', level: 1, slaHours: 24 }
    : typeof priority === 'string' 
      ? { name: priority, color: 'gray', level: 1, slaHours: 24 }
      : priority;

  const getPriorityIcon = () => {
    if (!showIcon || !priorityData) return null;
    
    const level = priorityData.level || 1;
    
    if (level >= 5) {
      return <Flame className="h-3 w-3" />;
    } else if (level >= 4) {
      return <Zap className="h-3 w-3" />;
    } else if (level >= 3) {
      return <AlertCircle className="h-3 w-3" />;
    } else if (level >= 2) {
      return <Clock className="h-3 w-3" />;
    } else {
      return <Star className="h-3 w-3" />;
    }
  };

  const getPriorityColorClasses = () => {
    if (!priorityData) return 'bg-gray-100 text-gray-700 border-gray-200';
    
    const color = (priorityData as any).color || '';
    const level = priorityData.level || 1;
    
    // Prefer configured color when available, otherwise map by level
    if (color) {
      const c = color.toLowerCase();
      if (c === 'red') return 'bg-red-100 text-red-700 border-red-200';
      if (c === 'orange') return 'bg-orange-100 text-orange-700 border-orange-200';
      if (c === 'yellow') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      if (c === 'green') return 'bg-green-100 text-green-700 border-green-200';
      if (c === 'blue') return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    // Fallback: level based
    if (level >= 5) {
      return 'bg-red-100 text-red-700 border-red-200';
    } else if (level >= 4) {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    } else if (level >= 3) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    } else if (level >= 2) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    } else {
      return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5';
      case 'lg':
        return 'text-sm px-3 py-1.5';
      default:
        return 'text-xs px-2 py-1';
    }
  };

  // Additional safety check
  if (!priorityData) {
    return (
      <Badge 
        variant="outline" 
        className={`${getSizeClasses()} ${className}`}
      >
        Unknown Priority
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`${getPriorityColorClasses()} ${getSizeClasses()} ${className} hover:brightness-95`}
    >
      <div className="flex items-center gap-1">
        {getPriorityIcon()}
        <span className="font-medium">{priorityData.name || 'Unknown'}</span>
        {/* SLA hours display removed - not available on priority model */}
      </div>
    </Badge>
  );
};
