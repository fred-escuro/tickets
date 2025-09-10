import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface TaskStatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED', reason: string) => void;
  currentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  taskTitle: string;
}

const statusOptions = [
  { value: 'PENDING', label: 'Pending', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'BLOCKED', label: 'Blocked', color: 'bg-red-100 text-red-700 border-red-200' },
];

export const TaskStatusChangeDialog: React.FC<TaskStatusChangeDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  taskTitle
}) => {
  const [selectedStatus, setSelectedStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'>(currentStatus);
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(selectedStatus, reason.trim());
    setReason('');
    onClose();
  };

  const handleClose = () => {
    setSelectedStatus(currentStatus);
    setReason('');
    onClose();
  };

  const selectedStatusOption = statusOptions.find(option => option.value === selectedStatus);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Change Task Status
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Task</Label>
            <div className="text-sm text-muted-foreground truncate" title={taskTitle}>
              {taskTitle}
            </div>
          </div>

          {/* Current Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Status</Label>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`text-xs ${statusOptions.find(option => option.value === currentStatus)?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}
              >
                {statusOptions.find(option => option.value === currentStatus)?.label || currentStatus}
              </Badge>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-status" className="text-sm font-medium">New Status</Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as any)}>
              <SelectTrigger id="new-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${option.color}`}
                      >
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason for Change */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Change
              <span className="text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're changing the status..."
              className="resize-none"
            />
          </div>

          {/* Status Change Preview */}
          {selectedStatus !== currentStatus && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="text-sm font-medium mb-2">Status Change Preview</div>
              <div className="flex items-center gap-2 text-sm">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${statusOptions.find(option => option.value === currentStatus)?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  {statusOptions.find(option => option.value === currentStatus)?.label || currentStatus}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${selectedStatusOption?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  {selectedStatusOption?.label || selectedStatus}
                </Badge>
              </div>
              {reason.trim() && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Reason:</strong> {reason.trim()}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={selectedStatus === currentStatus}
            >
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
