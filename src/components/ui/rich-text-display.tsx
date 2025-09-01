import React from 'react';
import { cn } from '@/lib/utils';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export const RichTextDisplay: React.FC<RichTextDisplayProps> = ({
  content,
  className
}) => {
  return (
    <div 
      className={cn(
        'prose prose-sm max-w-none',
        'prose-headings:text-foreground prose-headings:font-semibold',
        'prose-p:text-foreground prose-p:leading-relaxed',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-em:text-foreground prose-em:italic',
        'prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
        'prose-pre:bg-muted prose-pre:text-foreground prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto',
        'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic',
        'prose-ul:list-disc prose-ul:pl-6',
        'prose-ol:list-decimal prose-ol:pl-6',
        'prose-li:text-foreground',
        'prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80',
        'prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto',
        'prose-hr:border-border',
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};
