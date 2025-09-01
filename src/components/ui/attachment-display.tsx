import React from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { 
  File as FileIcon, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  Download,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TicketAttachment } from '@/data/mockData';
import { openAttachmentViewer } from '@/lib/attachmentViewer';

interface AttachmentDisplayProps {
  attachments: TicketAttachment[];
  className?: string;
  showDownload?: boolean;
  showPreview?: boolean;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
  if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <Archive className="h-4 w-4" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachments,
  className,
  showDownload = true,
  showPreview = true
}) => {
  if (attachments.length === 0) {
    return null;
  }

  const handleDownload = (attachment: TicketAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (attachment: TicketAttachment, index: number) => {
    openAttachmentViewer(attachments, index);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Attachments ({attachments.length})</h4>
      </div>
      
             <div className="grid gap-2">
         {attachments.map((attachment, index) => (
           <Card 
             key={attachment.id} 
             className="p-3 hover:bg-muted/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
             onClick={() => handlePreview(attachment, index)}
           >
             <CardContent className="p-0">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                   {getFileIcon(attachment.type)}
                 </div>
                 
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium truncate">{attachment.name}</p>
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <span>{formatFileSize(attachment.size)}</span>
                     <span>•</span>
                     <span>{formatDate(attachment.uploadedAt)}</span>
                     <span>•</span>
                     <span>{attachment.uploadedBy}</span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-1">
                   {showDownload && (
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         handleDownload(attachment);
                       }}
                       className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                     >
                       <Download className="h-3 w-3" />
                     </Button>
                   )}
                 </div>
               </div>
             </CardContent>
           </Card>
         ))}
       </div>

       
    </div>
  );
};
