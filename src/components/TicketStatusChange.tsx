import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Clock, 
  User, 
  MessageSquare, 
  ChevronDown,
  History,
  AlertCircle,
  CheckCircle,
  EyeOff
} from 'lucide-react';
import { ticketSystemService, type TicketStatus } from '@/lib/services/ticketSystemService';
import { TicketStatusHistory } from './TicketStatusHistory';
import { toast } from 'sonner';

interface TicketStatusChangeProps {
  ticketId: string;
  currentStatus: string;
  currentStatusId?: string;
  onStatusChange: (newStatusId: string, reason?: string, comment?: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

interface StatusChangeHistory {
  id: string;
  statusName: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
  comment?: string;
}

export const TicketStatusChange: React.FC<TicketStatusChangeProps> = ({
  ticketId,
  currentStatus,
  currentStatusId,
  onStatusChange,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [statusHistory, setStatusHistory] = useState<StatusChangeHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load available statuses
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const statusesData = await ticketSystemService.getStatuses();
        setStatuses(statusesData);
      } catch (error) {
        console.error('Failed to load statuses:', error);
        toast.error('Failed to load available statuses');
      }
    };

    if (isOpen) {
      loadStatuses();
    }
  }, [isOpen]);

  // Load status history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        // This would need to be implemented in the backend
        // For now, we'll use mock data
        const mockHistory: StatusChangeHistory[] = [
          {
            id: '1',
            statusName: 'Open',
            changedBy: 'John Doe',
            changedAt: new Date().toISOString(),
            reason: 'Ticket created',
            comment: 'Initial ticket submission'
          }
        ];
        setStatusHistory(mockHistory);
      } catch (error) {
        console.error('Failed to load status history:', error);
      }
    };

    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  const handleStatusChange = async () => {
    if (!selectedStatusId) {
      toast.error('Please select a new status');
      return;
    }

    setLoading(true);
    try {
      await onStatusChange(selectedStatusId, reason, comment);
      toast.success('Status updated successfully');
      setIsOpen(false);
      setSelectedStatusId('');
      setReason('');
      setComment('');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatus = () => {
    return statuses.find(s => s.id === currentStatusId) || 
           statuses.find(s => s.name === currentStatus) ||
           { name: currentStatus, color: 'gray', isClosed: false, isResolved: false };
  };

  const getAvailableTransitions = () => {
    const current = getCurrentStatus();
    if (!current || !current.allowedTransitions?.transitions) {
      return statuses.filter(s => s.id !== currentStatusId);
    }
    
    return statuses.filter(s => 
      current.allowedTransitions!.transitions.includes(s.id) && s.id !== currentStatusId
    );
  };

  const currentStatusData = getCurrentStatus();
  const availableTransitions = getAvailableTransitions();

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <Badge 
                className={`${ticketSystemService.getStatusColorClass(currentStatusData.color)} text-xs`}
              >
                {currentStatusData.name}
              </Badge>
              <ChevronDown className="h-3 w-3" />
            </Button>
            
            {/* Status indicators */}
            <div className="flex items-center gap-1">
              {currentStatusData.isClosed && (
                <EyeOff className="h-3 w-3 text-muted-foreground" title="Ticket is closed" />
              )}
              {currentStatusData.isResolved && (
                <CheckCircle className="h-3 w-3 text-green-600" title="Ticket is resolved" />
              )}
            </div>
          </div>
        </DialogTrigger>
        
        <DialogContent overlayClassName="!z-[140]" overlayStyle={{ zIndex: 140 }} contentStyle={{ zIndex: 150 }} className="max-w-2xl !z-[150]">
          <DialogHeader>
            <DialogTitle>Change Ticket Status</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label className="text-sm text-muted-foreground">Current Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${ticketSystemService.getStatusColorClass(currentStatusData.color)}`}>
                    {currentStatusData.name}
                  </Badge>
                  {currentStatusData.isClosed && <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  {currentStatusData.isResolved && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
            </div>

            {/* Status History */}
            {showHistory && (
              <TicketStatusHistory ticketId={ticketId} />
            )}

            {/* New Status Selection */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-status">New Status</Label>
                <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransitions.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <Badge className={`${ticketSystemService.getStatusColorClass(status.color)} text-xs`}>
                            {status.name}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {status.isClosed && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                            {status.isResolved && <CheckCircle className="h-3 w-3 text-green-600" />}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason for change */}
              <div>
                <Label htmlFor="reason">Reason for Change</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you changing the status?"
                  rows={2}
                />
              </div>

              {/* Additional comment */}
              <div>
                <Label htmlFor="comment">Additional Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Any additional notes about this status change..."
                  rows={3}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleStatusChange} 
                disabled={!selectedStatusId || loading}
                className="min-w-[100px]"
              >
                {loading ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
