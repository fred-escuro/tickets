import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showInitials?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-32 w-32 text-2xl'
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className,
  showInitials = true
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset states when src changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Generate initials from fallback text
  const getInitials = (text: string) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if we have a valid image source
  const hasValidImage = src && src.trim() !== '' && !imageError;

  // Show image if available and no error
  if (hasValidImage) {
    return (
      <div className={cn(
        'relative rounded-full overflow-hidden bg-muted flex items-center justify-center',
        sizeClasses[size],
        className
      )}>
        <img
          src={src}
          alt={alt}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="animate-pulse bg-muted-foreground/20 rounded-full h-4 w-4" />
          </div>
        )}
      </div>
    );
  }

  // Show initials fallback
  if (showInitials && fallback) {
    return (
      <div className={cn(
        'rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium border-2 border-primary/20',
        sizeClasses[size],
        className
      )}>
        {getInitials(fallback)}
      </div>
    );
  }

  // Show default avatar icon
  return (
    <div className={cn(
      'rounded-full bg-muted flex items-center justify-center text-muted-foreground',
      sizeClasses[size],
      className
    )}>
      <svg
        className="h-1/2 w-1/2"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
};
