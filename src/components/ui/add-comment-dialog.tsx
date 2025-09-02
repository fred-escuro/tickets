import React, { useState } from 'react';
import { Button } from './button';
import { Label } from './label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { RichTextEditor } from './rich-text-editor';
import { FileUpload, type FileAttachment } from './file-upload';
import { Switch } from './switch';
import { toast } from 'sonner';
import { MessageSquare, X, Eye, EyeOff } from 'lucide-react';

interface AddCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: { content: string; attachments: FileAttachment[]; isInternal: boolean }) => Promise<void>;
  ticketId?: string;
  ticketTitle?: string;
  placeholder?: string;
  title?: string;
}

export const AddCommentDialog: React.FC<AddCommentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ticketId,
  ticketTitle,
  placeholder = "Add your comment here...",
  title = "Add Comment"
}) => {
  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ content: comment, attachments, isInternal });
      toast.success('Comment added successfully!');
      handleClose();
    } catch (error) {
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComment('');
    setAttachments([]);
    setIsInternal(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {title}
            {ticketId && (
              <span className="text-sm text-muted-foreground font-normal">
                #{ticketId}
              </span>
            )}
          </DialogTitle>
          {ticketTitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {ticketTitle}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Comment Editor */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <RichTextEditor
              value={comment}
              onChange={setComment}
              placeholder={placeholder}
              className="min-h-[200px]"
            />
          </div>

          {/* Internal Comment Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="internal-comment" className="text-sm font-medium">
                Internal Comment
              </Label>
              <p className="text-xs text-muted-foreground">
                Internal comments are only visible to support team members
              </p>
            </div>
            <Switch
              id="internal-comment"
              checked={isInternal}
              onCheckedChange={setIsInternal}
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <FileUpload
              files={attachments}
              onFilesChange={setAttachments}
              maxFiles={5}
              maxFileSize={5 * 1024 * 1024} // 5MB
              acceptedTypes={[
                'image/*',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
              ]}
            />
          </div>
        </div>
        {/* Action Buttons - footer outside scroll */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !comment.trim()}
            className="min-w-[100px]"
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
