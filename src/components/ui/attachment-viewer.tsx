import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { 
  File as FileIcon, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TicketAttachment } from '@/data/mockData';

interface AttachmentViewerProps {
  attachments: TicketAttachment[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
  if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <Archive className="h-4 w-4" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
};

const getFileIconText = (type: string) => {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return '📦';
  if (type.includes('pdf') || type.includes('document')) return '📄';
  return '📎';
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

// Function to load authenticated images
const loadAuthenticatedImage = async (url: string): Promise<string> => {
  try {
    const authToken = localStorage.getItem('auth-token') || 
                     localStorage.getItem('token') || 
                     localStorage.getItem('access_token') || 
                     localStorage.getItem('accessToken');

    if (!authToken) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    return blobUrl;
  } catch (error) {
    console.error('Failed to load authenticated image:', error);
    throw error;
  }
};

export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
  attachments,
  isOpen,
  onClose,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({});
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const blobUrlsRef = useRef<Record<number, string>>({});

  // Update ref when blobUrls changes
  useEffect(() => {
    blobUrlsRef.current = blobUrls;
  }, [blobUrls]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setImageZoom(1);
      setImageRotation(0);
      setBlobUrls({});
      blobUrlsRef.current = {};
    }
  }, [isOpen, initialIndex]);

  const currentAttachment = attachments[currentIndex];
  
  // Debug logging
  console.log('Current index:', currentIndex);
  console.log('Current attachment:', currentAttachment);
  console.log('Current blob URL:', blobUrls[currentIndex]);
  console.log('All blob URLs:', blobUrls);

  // Load authenticated image when current attachment changes
  useEffect(() => {
    if (currentAttachment && currentAttachment.type.startsWith('image/')) {
      const loadImage = async () => {
        // Clear any existing blob URL for this index first
        if (blobUrlsRef.current[currentIndex]) {
          URL.revokeObjectURL(blobUrlsRef.current[currentIndex]);
        }
        
        setIsLoadingImage(true);
        try {
          const authenticatedUrl = await loadAuthenticatedImage(currentAttachment.url);
          setBlobUrls(prev => ({ ...prev, [currentIndex]: authenticatedUrl }));
          blobUrlsRef.current[currentIndex] = authenticatedUrl;
        } catch (error) {
          console.error('Failed to load image:', error);
        } finally {
          setIsLoadingImage(false);
        }
      };

      loadImage();
    }
  }, [currentAttachment, currentIndex]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(blobUrlsRef.current).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []); // Empty dependency array - only run on unmount

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up all blob URLs when modal closes
      setBlobUrls(prev => {
        Object.values(prev).forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return {};
      });
      blobUrlsRef.current = {};
    }
  }, [isOpen]); // Only depend on isOpen

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    setImageZoom(1);
    setImageRotation(0);
    
    // Clear the current blob URL to force reload
    if (blobUrls[currentIndex]) {
      URL.revokeObjectURL(blobUrls[currentIndex]);
      setBlobUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[currentIndex];
        return newUrls;
      });
    }
  };

  const nextFile = () => {
    const nextIndex = (currentIndex + 1) % attachments.length;
    goToIndex(nextIndex);
  };

  const prevFile = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : attachments.length - 1;
    goToIndex(prevIndex);
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openFileInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        prevFile();
        break;
      case 'ArrowRight':
        nextFile();
        break;
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!currentAttachment) return null;

  const isImage = currentAttachment.type.startsWith('image/');
  const isVideo = currentAttachment.type.startsWith('video/');
  const isAudio = currentAttachment.type.startsWith('audio/');
  const canNavigate = attachments.length > 1;
  const currentImageUrl = blobUrls[currentIndex];



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
             <DialogContent className="max-w-[90vw] w-[600px] min-w-[600px] max-h-[80vh] min-h-[500px] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getFileIconText(currentAttachment.type)}</div>
              <div>
                <DialogTitle className="text-lg font-medium max-w-[500px] truncate">
                  {currentAttachment.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(currentAttachment.size)} • {formatDate(currentAttachment.uploadedAt)}
                </p>
              </div>
              {canNavigate && (
                <Badge variant="secondary" className="ml-2">
                  {currentIndex + 1} of {attachments.length}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
                    disabled={imageZoom <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
                    disabled={imageZoom >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageRotation((imageRotation + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile(currentAttachment.url, currentAttachment.name)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative overflow-auto" style={{ minHeight: '300px', maxHeight: '300px' }}>
                     {/* Navigation arrows */}
           {canNavigate && (
             <>
                               <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-[60] bg-background border-2 shadow-lg hover:bg-accent"
                  onClick={prevFile}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-[60] bg-background border-2 shadow-lg hover:bg-accent"
                  onClick={nextFile}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
             </>
           )}

                                           {/* File content */}
             <div className="w-full h-full flex items-center justify-center">
              {isImage && (
                <>
                  {isLoadingImage ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading image...</p>
                      </div>
                    </div>
                  ) : currentImageUrl ? (
                                                             <img
                      src={currentImageUrl}
                      alt={currentAttachment.name}
                      className="w-auto h-auto max-w-full max-h-full object-contain"
                      style={{
                        transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                        transition: 'transform 0.2s ease-in-out'
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                        ❌
                      </div>
                      <p className="text-sm text-muted-foreground">Failed to load image</p>
                    </div>
                  )}
                </>
              )}
            
            {isVideo && (
              <video
                src={currentAttachment.url}
                controls
                autoPlay
                className="max-w-full max-h-full"
              >
                Your browser does not support the video tag.
              </video>
            )}
            
            {isAudio && (
              <div className="text-center">
                <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                  🎵
                </div>
                <audio
                  src={currentAttachment.url}
                  controls
                  autoPlay
                  className="w-full max-w-md"
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
            )}
            
            {!isImage && !isVideo && !isAudio && (
              <div className="text-center">
                <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                  {getFileIconText(currentAttachment.type)}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-medium">{currentAttachment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(currentAttachment.size)}
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => openFileInNewTab(currentAttachment.url)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                    <Button
                      onClick={() => downloadFile(currentAttachment.url, currentAttachment.name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail navigation */}
        <div className="p-6 border-t flex-shrink-0 bg-background" style={{ minHeight: '120px' }}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {attachments && Array.isArray(attachments) && attachments.length > 0 ? (
              attachments.map((attachment, index) => (
                <div
                  key={index}
                                     className={cn(
                     "flex-shrink-0 w-20 h-20 rounded-lg border-2 cursor-pointer overflow-hidden transition-all duration-200",
                     index === currentIndex
                       ? "border-primary shadow-md"
                       : "border-border hover:border-primary/50 hover:shadow-sm"
                   )}
                  onClick={() => goToIndex(index)}
                >
                  {attachment.type.startsWith('image/') ? (
                    <AuthenticatedThumbnail 
                      url={attachment.url} 
                      alt={attachment.name} 
                      index={index}
                      blobUrls={blobUrls}
                      setBlobUrls={setBlobUrls}
                      currentIndex={currentIndex}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-lg">
                      {getFileIconText(attachment.type)}
                    </div>
                  )}
                </div>
              ))
                         ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Component for authenticated thumbnail loading
const AuthenticatedThumbnail: React.FC<{
  url: string;
  alt: string;
  index: number;
  blobUrls: Record<number, string>;
  setBlobUrls: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  currentIndex: number;
}> = ({ url, alt, index, blobUrls, setBlobUrls, currentIndex }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (blobUrls[index]) return; // Already loaded
    
    const loadThumbnail = async () => {
      setIsLoading(true);
      try {
        const authenticatedUrl = await loadAuthenticatedImage(url);
        setBlobUrls(prev => ({ ...prev, [index]: authenticatedUrl }));
      } catch (error) {
        console.error('Failed to load thumbnail:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThumbnail();
  }, [url, index, setBlobUrls, blobUrls]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (blobUrls[index]) {
    return (
      <img
        src={blobUrls[index]}
        alt={alt}
        className="w-full h-full object-cover"
        style={{
          objectFit: 'cover'
        }}
      />
    );
  }

  return (
    <div className="w-full h-full bg-muted flex items-center justify-center text-lg">
      ❌
    </div>
  );
};
