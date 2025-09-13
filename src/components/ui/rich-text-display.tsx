import React from 'react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

// Sanitize MSO tags while preserving standard HTML
const sanitizeMsoTags = (html: string): string => {
  if (!html) return html;

  let sanitized = html;

  // Remove MSO-specific tags and attributes
  // Remove MSO conditional comments
  sanitized = sanitized.replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, '');
  
  // Remove MSO-specific style attributes
  sanitized = sanitized.replace(/\s*mso-[^;=]*[;"]/gi, '');
  
  // Remove MSO-specific CSS classes
  sanitized = sanitized.replace(/\s*MsoNormal[^"'\s]*/gi, '');
  sanitized = sanitized.replace(/\s*MsoListParagraph[^"'\s]*/gi, '');
  sanitized = sanitized.replace(/\s*MsoListTable[^"'\s]*/gi, '');
  
  // Clean up empty attributes and extra spaces
  sanitized = sanitized.replace(/style="\s*"/gi, '');
  sanitized = sanitized.replace(/style="\s*;\s*"/gi, '');
  sanitized = sanitized.replace(/style="\s*;\s*;"/gi, '');
  sanitized = sanitized.replace(/class="\s*"/gi, '');
  sanitized = sanitized.replace(/\s+style="/gi, ' style="');
  sanitized = sanitized.replace(/\s+class="/gi, ' class="');
  
  // Clean up extra spaces around attributes
  sanitized = sanitized.replace(/\s+>/gi, '>');
  sanitized = sanitized.replace(/<([^>]+)\s+>/gi, '<$1>');
  
  // Remove MSO-specific XML namespaces
  sanitized = sanitized.replace(/\s*xmlns:v="urn:schemas-microsoft-com:vml"/gi, '');
  sanitized = sanitized.replace(/\s*xmlns:o="urn:schemas-microsoft-com:office:office"/gi, '');
  sanitized = sanitized.replace(/\s*xmlns:w="urn:schemas-microsoft-com:office:word"/gi, '');
  
  // Remove MSO-specific tags
  sanitized = sanitized.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '');
  sanitized = sanitized.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '');
  sanitized = sanitized.replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '');
  
  // Remove MSO-specific style blocks
  sanitized = sanitized.replace(/<style[^>]*>\s*\/\*\[if[^>]*>[\s\S]*?<!\[endif\]\*\/\s*<\/style>/gi, '');
  
  // Clean up empty paragraphs and divs that might be left behind
  sanitized = sanitized.replace(/<p[^>]*>\s*<\/p>/gi, '');
  sanitized = sanitized.replace(/<div[^>]*>\s*<\/div>/gi, '');
  
  // Clean up multiple consecutive line breaks
  sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return sanitized.trim();
};

// Robust HTML sanitization using DOMPurify
const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // First sanitize MSO tags
  const msoSanitized = sanitizeMsoTags(html);
  
  // Configure DOMPurify to allow safe HTML tags and attributes
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'sub', 'sup', 'small', 'mark', 'del', 'ins'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id', 'style',
      'target', 'rel', 'colspan', 'rowspan', 'align', 'valign'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false
  };
  
  return DOMPurify.sanitize(msoSanitized, config);
};

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
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
};
