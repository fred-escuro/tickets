import React, { useState, useCallback, useRef } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { 
  Upload, 
  X, 
  File as FileIcon, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  uploaded?: boolean;
  url?: string;
}

interface FileUploadProps {
  files: FileAttachment[];
  onFilesChange: (files: FileAttachment[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
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

export const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['*/*'],
  className,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    if (maxFileSize && file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)}`;
    }
    
    if (acceptedTypes.length > 0 && !acceptedTypes.includes('*/*')) {
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      });
      
      // Also check file extension as fallback
      if (!isAccepted) {
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar'];
        if (fileExtension && allowedExtensions.includes(fileExtension)) {
          return null; // Allow by extension
        }
        return `File type ${file.type} (${fileExtension}) is not accepted`;
      }
    }
    
    return null;
  };

  const createFileAttachment = (file: File): FileAttachment => {
    const attachment: FileAttachment = {
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded: false
    };

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        attachment.preview = e.target?.result as string;
        // Don't call onFilesChange here - it causes race conditions
        // The preview will be updated when the component re-renders
      };
      reader.readAsDataURL(file);
    }

    return attachment;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    console.log('File selection:', selectedFiles);
    console.log('Current files before processing:', files);
    const newFiles: FileAttachment[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach(file => {
      console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
      const error = validateFile(file);
      if (error) {
        console.log('File validation failed:', file.name, error);
        errors.push(`${file.name}: ${error}`);
      } else {
        console.log('File validation passed:', file.name);
        const attachment = createFileAttachment(file);
        console.log('Created attachment:', attachment);
        newFiles.push(attachment);
      }
    });

    if (errors.length > 0) {
      console.log('File validation errors:', errors);
      alert('Some files could not be uploaded:\n' + errors.join('\n'));
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
      console.log('Updating files from', files.length, 'to', updatedFiles.length);
      console.log('New files added:', newFiles.map(f => f.name));
      console.log('Calling onFilesChange with:', updatedFiles);
      try {
        onFilesChange(updatedFiles);
        console.log('onFilesChange called successfully');
      } catch (error) {
        console.error('Error calling onFilesChange:', error);
      }
    } else {
      console.log('No new files to add');
    }
  }, [files, maxFiles, maxFileSize, acceptedTypes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(f => f.id !== id);
    onFilesChange(updatedFiles);
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* File Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragOver && !disabled ? 'border-primary bg-primary/5' : 'border-border',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-1">
          Drag and drop files here, or click to select
        </p>
        <p className="text-xs text-muted-foreground">
          Max {maxFiles} files, up to {formatFileSize(maxFileSize)} each
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',') + ',.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar'}
          onChange={(e) => {
            console.log('File input onChange triggered:', e.target.files);
            handleFileSelect(e.target.files);
          }}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Attachments ({files.length}/{maxFiles})</h4>
            {files.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilesChange([])}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          
          <div className="grid gap-2">
            {files.map((file) => (
              <Card key={file.id} className="p-3 border border-border shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {file.uploaded && (
                        <Badge variant="secondary" className="text-xs">
                          Uploaded
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
