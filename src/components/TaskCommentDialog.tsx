import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';

interface TaskCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  taskTitle: string;
  isLoading?: boolean;
}

export const TaskCommentDialog: React.FC<TaskCommentDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  taskTitle,
  isLoading = false
}) => {
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    if (comment.trim()) {
      onConfirm(comment.trim());
      setComment('');
      onClose();
    }
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Add Comment to Task
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

          {/* Comment Input */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Comment
            </Label>
            <Textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your comment here..."
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!comment.trim() || isLoading}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {isLoading ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
