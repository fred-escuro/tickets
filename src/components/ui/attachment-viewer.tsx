import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from './button';

import { Badge } from './badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { 
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
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



const getFileIconText = (type: string) => {
  // Specific image types
  if (type === 'image/jpeg' || type === 'image/jpg') return '🖼️';
  if (type === 'image/png') return '🖼️';
  if (type === 'image/gif') return '🎬';
  if (type === 'image/webp') return '🖼️';
  if (type === 'image/svg+xml') return '🎨';
  if (type === 'image/bmp') return '🖼️';
  if (type === 'image/tiff' || type === 'image/tif') return '🖼️';
  if (type === 'image/ico') return '🖼️';
  if (type === 'image/heic' || type === 'image/heif') return '🖼️';
  if (type === 'image/avif') return '🖼️';
  if (type === 'image/jxl') return '🖼️';
  if (type === 'image/jp2' || type === 'image/jpx') return '🖼️';
  
  // Generic image fallback
  if (type.startsWith('image/')) return '🖼️';
  
  // Other file types
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return '📦';
  if (type.includes('pdf') || type.includes('document')) return '📄';
  return '📎';
};

const getFileTypeName = (type: string): string => {
  // Specific image types
  if (type === 'image/jpeg' || type === 'image/jpg') return 'JPEG Image';
  if (type === 'image/png') return 'PNG Image';
  if (type === 'image/gif') return 'GIF Image';
  if (type === 'image/webp') return 'WebP Image';
  if (type === 'image/svg+xml') return 'SVG Image';
  if (type === 'image/bmp') return 'BMP Image';
  if (type === 'image/tiff' || type === 'image/tif') return 'TIFF Image';
  if (type === 'image/ico') return 'Icon Image';
  if (type === 'image/heic' || type === 'image/heif') return 'HEIC Image';
  if (type === 'image/avif') return 'AVIF Image';
  if (type === 'image/jxl') return 'JPEG XL Image';
  if (type === 'image/jp2' || type === 'image/jpx') return 'JPEG 2000 Image';
  
  // Generic image fallback
  if (type.startsWith('image/')) return 'Image File';
  
  // Other file types
  if (type.startsWith('video/')) return 'Video File';
  if (type.startsWith('audio/')) return 'Audio File';
  if (type.includes('pdf')) return 'PDF Document';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return 'Archive File';
  if (type.includes('document') || type.includes('word')) return 'Word Document';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'Excel Spreadsheet';
  if (type.includes('text/')) return 'Text File';
  
  return 'File';
};

const isImageFormatSupported = (type: string): boolean => {
  // Check if the browser supports the image format
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return false;
  
  // Test if the format can be drawn on canvas
  try {
    // Create a small test image
    canvas.width = 1;
    canvas.height = 1;
    
    // Comprehensive list of supported image formats
    // Most modern browsers support these formats
    const supportedFormats = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/svg+xml', 'image/bmp', 'image/ico',
      'image/tiff', 'image/tif', 'image/heic', 'image/heif',
      'image/avif', 'image/jxl', 'image/jp2', 'image/jpx'
    ];
    
    return supportedFormats.includes(type);
  } catch (error) {
    return false;
  }
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

const formatFileName = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension found, just truncate to 10 characters
    return filename.length > 10 ? filename.substring(0, 10) + '...' : filename;
  }
  
  const name = filename.substring(0, lastDotIndex);
  const extension = filename.substring(lastDotIndex);
  
  if (name.length <= 10) {
    return filename;
  }
  
  return name.substring(0, 10) + '...' + extension;
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
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

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
      setImageDimensions(null);
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
        
        // Check if the image format is supported
        if (!isImageFormatSupported(currentAttachment.type)) {
          console.warn(`Image format ${currentAttachment.type} may not be supported by this browser`);
        }
        
        setIsLoadingImage(true);
        try {
          const authenticatedUrl = await loadAuthenticatedImage(currentAttachment.url);
          setBlobUrls(prev => ({ ...prev, [currentIndex]: authenticatedUrl }));
          blobUrlsRef.current[currentIndex] = authenticatedUrl;
        } catch (error) {
          console.error('Failed to load image:', error);
          // Set a placeholder for failed images
          setBlobUrls(prev => ({ ...prev, [currentIndex]: 'failed' }));
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
    setImageDimensions(null);
    
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

  const downloadFile = async (url: string, filename: string) => {
    try {
      // For images, use the blob URL if available, otherwise fetch with auth
      let downloadUrl = url;
      
      if (currentAttachment.type.startsWith('image/') && blobUrls[currentIndex] && blobUrls[currentIndex] !== 'failed') {
        downloadUrl = blobUrls[currentIndex];
      } else {
        // For non-images or when blob URL is not available, fetch with authentication
        const authToken = localStorage.getItem('auth-token') || 
                         localStorage.getItem('token') || 
                         localStorage.getItem('access_token') || 
                         localStorage.getItem('accessToken');

        if (authToken) {
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });

          if (response.ok) {
            const blob = await response.blob();
            downloadUrl = URL.createObjectURL(blob);
          } else {
            // If the authenticated request fails, don't fallback to original URL
            // as it will also fail without authentication
            console.error('Failed to download file with authentication:', response.status, response.statusText);
            return;
          }
        } else {
          // No auth token available, cannot download the file
          console.error('No authentication token available');
          return;
        }
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL if we created one
      if (downloadUrl.startsWith('blob:') && downloadUrl !== blobUrls[currentIndex]) {
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Don't fallback to original URL as it will fail without authentication
      // Instead, show an error message or handle gracefully
    }
  };

  const openFileInNewTab = async (url: string) => {
    try {
      // For images, use the blob URL if available, otherwise fetch with auth
      let openUrl = url;
      
      if (currentAttachment.type.startsWith('image/') && blobUrls[currentIndex] && blobUrls[currentIndex] !== 'failed') {
        openUrl = blobUrls[currentIndex];
      } else {
        // For non-images or when blob URL is not available, fetch with authentication
        const authToken = localStorage.getItem('auth-token') || 
                         localStorage.getItem('token') || 
                         localStorage.getItem('access_token') || 
                         localStorage.getItem('accessToken');

        if (authToken) {
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });

          if (response.ok) {
            const blob = await response.blob();
            openUrl = URL.createObjectURL(blob);
          } else {
            // If the authenticated request fails, don't fallback to original URL
            // as it will also fail without authentication
            console.error('Failed to fetch file with authentication:', response.status, response.statusText);
            return;
          }
        } else {
          // No auth token available, cannot open the file
          console.error('No authentication token available');
          return;
        }
      }

      window.open(openUrl, '_blank');

      // Clean up blob URL if we created one (after a delay to allow the tab to load)
      if (openUrl.startsWith('blob:') && openUrl !== blobUrls[currentIndex]) {
        setTimeout(() => URL.revokeObjectURL(openUrl), 1000);
      }
    } catch (error) {
      console.error('Open in new tab failed:', error);
      // Don't fallback to original URL as it will fail without authentication
      // Instead, show an error message or handle gracefully
    }
  };

  // Function to compute image dimensions and calculate display size
  const computeImageDisplaySize = (originalWidth: number, originalHeight: number) => {
    // Get the container height dynamically based on current window size
    const containerHeight = Math.min(windowSize.height * 0.6, 500);
    
    if (originalHeight <= containerHeight) {
      return { width: originalWidth, height: originalHeight };
    }
    
    // Calculate the scale factor to fit within container height
    const scaleFactor = containerHeight / originalHeight;
    return {
      width: originalWidth * scaleFactor,
      height: containerHeight
    };
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

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!currentAttachment) return null;

  const isImage = currentAttachment.type.startsWith('image/');
  const isVideo = currentAttachment.type.startsWith('video/');
  const isAudio = currentAttachment.type.startsWith('audio/');
  const canNavigate = attachments.length > 1;
  const currentImageUrl = blobUrls[currentIndex];



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
             <DialogContent className="max-w-[95vw] w-[min(90vw, 800px)] min-w-[min(90vw, 400px)] max-h-[90vh] p-0 flex flex-col overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-6 py-4 pb-3 border-b flex-shrink-0">
                     <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="text-xl">{getFileIconText(currentAttachment.type)}</div>
              <div>
                                 <DialogTitle className="text-base font-medium max-w-[200px] truncate" title={currentAttachment.name}>
                  {formatFileName(currentAttachment.name)}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(currentAttachment.size)} • {formatDate(currentAttachment.uploadedAt)}
                </p>
              </div>

            </div>
            
            <div className="flex items-center gap-1">
              {isImage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
                    disabled={imageZoom <= 0.5}
                    className="h-7 w-7 p-0"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
                    disabled={imageZoom >= 3}
                    className="h-7 w-7 p-0"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageRotation((imageRotation + 90) % 360)}
                    className="h-7 w-7 p-0"
                  >
                    <RotateCw className="h-3 w-3" />
                  </Button>
                </>
              )}
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                 variant="outline"
                 size="sm"
                 onClick={() => downloadFile(currentAttachment.url, currentAttachment.name)}
                 className="h-7 w-7 p-0"
               >
                 <Download className="h-3 w-3" />
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={onClose}
                 className="h-7 w-7 p-0"
               >
                 <X className="h-3 w-3" />
               </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative overflow-hidden" style={{ height: 'min(60vh, 500px)' }}>
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
                                                       <div className="w-full h-full flex items-center justify-center p-2 bg-gray-50">
              {isImage && (
                <>
                  {isLoadingImage ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading image...</p>
                      </div>
                    </div>
                                     ) : currentImageUrl && currentImageUrl !== 'failed' ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <img
                        src={currentImageUrl}
                        alt={currentAttachment.name}
                        className="bg-white rounded-lg shadow-sm"
                        style={{
                          width: imageDimensions ? `${computeImageDisplaySize(imageDimensions.width, imageDimensions.height).width * imageZoom}px` : 'auto',
                          height: imageDimensions ? `${computeImageDisplaySize(imageDimensions.width, imageDimensions.height).height * imageZoom}px` : 'auto',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          transform: `rotate(${imageRotation}deg)`,
                          transition: 'all 0.2s ease-in-out',
                          objectFit: 'contain'
                        }}
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          setImageDimensions({
                            width: img.naturalWidth,
                            height: img.naturalHeight
                          });
                        }}
                        onError={() => {
                          // Handle image load errors
                          setBlobUrls(prev => ({ ...prev, [currentIndex]: 'failed' }));
                        }}
                      />
                    </div>
                   ) : (
                     <div className="text-center">
                       <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                         {currentImageUrl === 'failed' ? '❌' : '🖼️'}
                       </div>
                       <p className="text-sm text-muted-foreground">
                         {currentImageUrl === 'failed' 
                           ? `Failed to load ${getFileTypeName(currentAttachment.type)}` 
                           : 'Loading image...'}
                       </p>
                       {currentImageUrl === 'failed' && (
                         <p className="text-xs text-muted-foreground mt-1">
                           {currentAttachment.type} • {formatFileSize(currentAttachment.size)}
                         </p>
                       )}
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
          
          {/* Image counter at bottom */}
          {canNavigate && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <Badge variant="secondary" className="text-xs bg-black/70 text-white border-0">
                {currentIndex + 1} of {attachments.length}
              </Badge>
            </div>
          )}
        </div>

        {/* Thumbnail navigation */}
        <div className="p-3 border-t flex-shrink-0 bg-background" style={{ minHeight: '80px' }}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {attachments && Array.isArray(attachments) && attachments.length > 0 ? (
              attachments.map((attachment, index) => (
                <div
                  key={index}
                                     className={cn(
                     "flex-shrink-0 w-12 h-12 rounded border-2 cursor-pointer overflow-hidden transition-all duration-200",
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

}> = ({ url, alt, index, blobUrls, setBlobUrls }) => {
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

  if (blobUrls[index] && blobUrls[index] !== 'failed') {
    return (
      <img
        src={blobUrls[index]}
        alt={alt}
        className="w-full h-full object-cover"
        style={{
          objectFit: 'cover'
        }}
        onError={() => {
          // Handle thumbnail load errors
          setBlobUrls(prev => ({ ...prev, [index]: 'failed' }));
        }}
      />
    );
  }

  if (blobUrls[index] === 'failed') {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
        ❌
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-muted flex items-center justify-center text-lg">
      🖼️
    </div>
  );
};
                                                                                                        