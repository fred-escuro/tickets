import React, { useState } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { 
  File as FileIcon, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  Eye,
  Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TicketAttachment } from '@/data/mockData';
import { AttachmentViewer } from './attachment-viewer';

interface AttachmentListProps {
  attachments: TicketAttachment[];
  className?: string;
  maxVisible?: number;
  compact?: boolean;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon className="h-3 w-3" />;
  if (type.startsWith('video/')) return <Video className="h-3 w-3" />;
  if (type.startsWith('audio/')) return <Music className="h-3 w-3" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <Archive className="h-3 w-3" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="h-3 w-3" />;
  return <FileIcon className="h-3 w-3" />;
};

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  className,
  maxVisible = 3,
  compact = false
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(0);

  if (attachments.length === 0) {
    return null;
  }

  const visibleAttachments = attachments.slice(0, maxVisible);
  const remainingCount = attachments.length - maxVisible;

  const handlePreview = (index: number) => {
    setSelectedAttachmentIndex(index);
    setIsViewerOpen(true);
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Paperclip className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePreview(0)}
          className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-3 w-3" />
        </Button>

        {/* Attachment Viewer Modal */}
        <AttachmentViewer
          attachments={attachments}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          initialIndex={selectedAttachmentIndex}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Paperclip className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Attachments ({attachments.length})
        </span>
      </div>
      
      <div className="flex flex-wrap gap-1">
        {visibleAttachments.map((attachment, index) => (
          <button
            key={attachment.id}
            onClick={() => handlePreview(index)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs",
              "bg-muted hover:bg-muted/80 transition-colors",
              "border border-border hover:border-primary/50"
            )}
          >
            {getFileIcon(attachment.type)}
            <span className="truncate max-w-20">{attachment.name}</span>
          </button>
        ))}
        
        {remainingCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>

      {/* Attachment Viewer Modal */}
      <AttachmentViewer
        attachments={attachments}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        initialIndex={selectedAttachmentIndex}
      />
    </div>
  );
};
