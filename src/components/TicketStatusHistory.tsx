import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Clock, 
  User, 
  MessageSquare, 
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { ticketSystemService, type TicketStatus } from '@/lib/services/ticketSystemService';

interface StatusHistoryEntry {
  id: string;
  statusId: string;
  statusName: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
  comment?: string;
}

interface TicketStatusHistoryProps {
  ticketId: string;
  className?: string;
}

export const TicketStatusHistory: React.FC<TicketStatusHistoryProps> = ({
  ticketId,
  className = ''
}) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);

  // Load status history
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        // This would call the backend API to get status history
        // For now, we'll use mock data
        const mockHistory: StatusHistoryEntry[] = [
          {
            id: '1',
            statusId: 'status-1',
            statusName: 'Open',
            changedBy: 'John Doe',
            changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            reason: 'Ticket created',
            comment: 'Initial ticket submission'
          },
          {
            id: '2',
            statusId: 'status-2',
            statusName: 'In Progress',
            changedBy: 'Jane Smith',
            changedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
            reason: 'Work started',
            comment: 'Beginning investigation of the issue'
          }
        ];
        setHistory(mockHistory);
      } catch (error) {
        console.error('Failed to load status history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (expanded) {
      loadHistory();
    }
  }, [ticketId, expanded]);

  // Load statuses for color mapping
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const statusesData = await ticketSystemService.getStatuses();
        setStatuses(statusesData);
      } catch (error) {
        console.error('Failed to load statuses:', error);
      }
    };

    if (expanded) {
      loadStatuses();
    }
  }, [expanded]);

  const getStatusColor = (statusName: string) => {
    const status = statuses.find(s => s.name === statusName);
    if (status) {
      return ticketSystemService.getStatusColorClass(status.color);
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (history.length === 0 && !expanded) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Status History
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 px-2"
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    {index < history.length - 1 && (
                      <div className="w-0.5 h-8 bg-muted-foreground/20 mt-1" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${getStatusColor(entry.statusName)} text-xs`}>
                        {entry.statusName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        by {entry.changedBy}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(entry.changedAt)}
                      </span>
                    </div>
                    
                    {entry.reason && (
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong>Reason:</strong> {entry.reason}
                      </p>
                    )}
                    
                    {entry.comment && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Comment:</strong> {entry.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No status history available
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
