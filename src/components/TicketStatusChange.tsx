import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  
  ChevronDown,
  History,
  CheckCircle,
  EyeOff,
  Pencil
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
  triggerMode?: 'status' | 'button';
  triggerLabel?: string;
}

export const TicketStatusChange: React.FC<TicketStatusChangeProps> = ({
  ticketId,
  currentStatus,
  currentStatusId,
  onStatusChange,
  disabled = false,
  className = '',
  triggerMode = 'status',
  triggerLabel = 'Change Status'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
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

  // Note: Detailed status history loading will be implemented on the backend.

  const handleStatusChange = async () => {
    if (!selectedStatusId) {
      toast.error('Please select a new status');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason for change is required');
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
    const normalizeKey = (v: any) => (v ?? '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const byId = statuses.find(s => s.id === currentStatusId);
    if (byId) return byId;
    const targetKey = normalizeKey(currentStatus);
    const byNormalized = statuses.find(s => normalizeKey(s.name) === targetKey);
    if (byNormalized) return byNormalized;
    return { name: currentStatus, color: 'gray', isClosed: false, isResolved: false } as any;
  };

  const getAvailableTransitions = () => {
    const current = getCurrentStatus();
    const raw: any = (current as any)?.allowedTransitions;
    const configured: any[] = Array.isArray(raw) ? raw : (raw?.transitions || []);

    const normalize = (v: any) => (v ?? '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const isCurrent = (s: any) => s.id === currentStatusId || normalize(s.name) === normalize(currentStatus);

    if (!Array.isArray(configured) || configured.length === 0) {
      return [] as TicketStatus[];
    }

    const byId = new Map(statuses.map(s => [s.id, s] as const));
    const byName = new Map(statuses.map(s => [normalize(s.name), s] as const));

    const unique = new Set<string>();
    const resolved: TicketStatus[] = [] as any;
    for (const entry of configured) {
      let match: TicketStatus | undefined;
      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        match = byId.get(trimmed) || byName.get(normalize(trimmed));
      } else if (entry && typeof entry === 'object') {
        // Support shapes like { id: "..." } or { name: "..." }
        const candidateId = (entry as any).id as string | undefined;
        const candidateName = (entry as any).name as string | undefined;
        if (candidateId) match = byId.get(candidateId);
        if (!match && candidateName) match = byName.get(normalize(candidateName));
      }

      if (match && !isCurrent(match) && !unique.has(match.id)) {
        unique.add(match.id);
        resolved.push(match);
      }
    }
    return resolved;
  };

  const currentStatusData = getCurrentStatus();
  const availableTransitions = getAvailableTransitions();

  // When dialog opens or options change, preselect the first available option for better UX
  useEffect(() => {
    if (!isOpen) return;
    if (availableTransitions.length > 0) {
      // Keep existing selection if still valid, otherwise choose first
      const stillValid = availableTransitions.some(s => s.id === selectedStatusId);
      setSelectedStatusId(stillValid ? selectedStatusId : availableTransitions[0].id);
    } else {
      setSelectedStatusId('');
    }
  }, [isOpen, availableTransitions]);

  // Debug: log resolution info to help diagnose missing options in environments with custom data
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw: any = (currentStatusData as any)?.allowedTransitions;
      const configured: any[] = Array.isArray(raw) ? raw : (raw?.transitions || []);
      const normalize = (v: any) => (v ?? '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const byId = new Map(statuses.map(s => [s.id, s] as const));
      const byName = new Map(statuses.map(s => [normalize(s.name), s] as const));
      const missing: any[] = [];
      for (const entry of configured) {
        let match;
        if (typeof entry === 'string') {
          const t = entry.trim();
          match = byId.get(t) || byName.get(normalize(t));
        } else if (entry && typeof entry === 'object') {
          match = byId.get((entry as any).id) || byName.get(normalize((entry as any).name));
        }
        if (!match) missing.push(entry);
      }
      const resolvedNames = availableTransitions.map(s => `${s.name} (${s.id.slice(0, 6)})`);
      const allNames = statuses.map(s => s.name);
      // eslint-disable-next-line no-console
      console.log('[TicketStatusChange] Current:', currentStatusData.name, '\nConfigured:', configured, '\nResolved:', resolvedNames, '\nMissing/Unresolved:', missing, '\nAll statuses:', allNames);
    } catch {}
  }, [isOpen, statuses, currentStatusId, currentStatus, availableTransitions]);

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {triggerMode === 'button' ? (
            <Button 
              variant="default" 
              disabled={disabled}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              {triggerLabel}
            </Button>
          ) : (
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
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                )}
                {currentStatusData.isResolved && (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                )}
              </div>
            </div>
          )}
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
                <Select value={selectedStatusId} onValueChange={setSelectedStatusId} disabled={availableTransitions.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {availableTransitions.length === 0 ? (
                      <SelectItem value="no-options" disabled>No transitions available</SelectItem>
                    ) : availableTransitions.map((status) => (
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
                <Label htmlFor="reason">Reason for Change <span className="text-red-600">*</span></Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you changing the status?"
                  rows={2}
                  className={!reason.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}
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
