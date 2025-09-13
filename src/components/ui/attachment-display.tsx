import React, { useState } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { 
  File as FileIcon, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttachmentViewer } from './attachment-viewer';
import { AttachmentService } from '@/lib/services/attachmentService';

// Backend attachment type
interface BackendAttachment {
  id: string;
  name: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedBy: string;
  uploadedAt: string | Date; // Can be string from backend or Date object
  ticketId?: string;
  commentId?: string;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
  };
}

interface AttachmentDisplayProps {
  attachments: BackendAttachment[];
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

const formatDate = (date: string | Date) => {
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
};

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({
  attachments,
  className,
  showDownload = true,
  // Removed unused showPreview parameter
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(0);

  if (attachments.length === 0) {
    return null;
  }

  const handleDownload = async (attachment: BackendAttachment) => {
    try {
      // Get the download URL
      const downloadUrl = AttachmentService.getDownloadUrl(attachment.id);
      
      // Get the auth token
      const authToken = localStorage.getItem('auth-token') || 
                       localStorage.getItem('token') || 
                       localStorage.getItem('access_token') || 
                       localStorage.getItem('accessToken');

      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      // Make authenticated request to download the file
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      // Get the file blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // You could show a toast notification here
      alert('Download failed. Please try again.');
    }
  };

  const handlePreview = (_attachment: BackendAttachment, index: number) => {
    setSelectedAttachmentIndex(index);
    setIsViewerOpen(true);
  };

  // Convert backend attachments to frontend format for the viewer
  const frontendAttachments = attachments.map(att => ({
    id: att.id,
    name: att.name,
    size: att.fileSize,
    type: att.mimeType,
    url: AttachmentService.getDownloadUrl(att.id),
    uploadedAt: typeof att.uploadedAt === 'string' ? new Date(att.uploadedAt) : att.uploadedAt,
    uploadedBy: att.uploader ? `${att.uploader.firstName} ${att.uploader.lastName}` : 'Unknown'
  }));

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
                  {getFileIcon(attachment.mimeType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.fileSize)}</span>
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

      {/* Attachment Viewer Modal */}
      <AttachmentViewer
        attachments={frontendAttachments}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        initialIndex={selectedAttachmentIndex}
      />
    </div>
  );
};
