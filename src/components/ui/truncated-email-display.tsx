import React, { useState } from 'react';
import { Button } from './button';
import { ChevronDown, ChevronUp, Code, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';

// Simplified MSO tag sanitization that preserves email formatting
const sanitizeMsoTags = (html: string): string => {
  if (!html) return html;

  let sanitized = html;
  
  // Remove MSO conditional comments
  sanitized = sanitized.replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, '');
  
  // Remove MSO-specific style attributes (but preserve other styles)
  sanitized = sanitized.replace(/\s*mso-[^;=]*[;"]/gi, '');
  
  // Remove MSO-specific CSS classes
  sanitized = sanitized.replace(/\s*MsoNormal[^"'\s]*/gi, '');
  sanitized = sanitized.replace(/\s*MsoListParagraph[^"'\s]*/gi, '');
  sanitized = sanitized.replace(/\s*MsoListTable[^"'\s]*/gi, '');
  
  // Clean up empty attributes
  sanitized = sanitized.replace(/style="\s*"/gi, '');
  sanitized = sanitized.replace(/style="\s*;\s*"/gi, '');
  sanitized = sanitized.replace(/class="\s*"/gi, '');
  
  // Remove MSO-specific XML namespaces
  sanitized = sanitized.replace(/\s*xmlns:o="urn:schemas-microsoft-com:office:office"/gi, '');
  sanitized = sanitized.replace(/\s*xmlns:w="urn:schemas-microsoft-com:office:word"/gi, '');
  
  // Remove MSO-specific tags
  sanitized = sanitized.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '');
  sanitized = sanitized.replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '');
  
  // Remove MSO-specific style blocks
  sanitized = sanitized.replace(/<style[^>]*>\s*\/\*\[if[^>]*>[\s\S]*?<!\[endif\]\*\/\s*<\/style>/gi, '');
  
  // Clean up empty paragraphs and divs
  sanitized = sanitized.replace(/<p[^>]*>\s*<\/p>/gi, '');
  sanitized = sanitized.replace(/<div[^>]*>\s*<\/div>/gi, '');
  
  // Clean up multiple consecutive line breaks
  sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return sanitized.trim();
};

// Parse and separate email thread information from content
const parseEmailThreads = (content: string): { cleanContent: string; threadInfo: string[] } => {
  if (!content) return { cleanContent: content, threadInfo: [] };
  
  // Pattern to match thread information like "Saturday, September 13, 2025 5:52 PM Test 37"
  const threadPattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s+(?:AM|PM)\s+Test\s+\d+/gi;
  
  const threadMatches = content.match(threadPattern);
  let cleanContent = content;
  
  if (threadMatches) {
    // Remove thread information from content
    cleanContent = content.replace(threadPattern, '').trim();
    
    // Clean up extra whitespace and line breaks
    cleanContent = cleanContent.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');
  }
  
  return {
    cleanContent,
    threadInfo: threadMatches || []
  };
};

// Limit images in HTML content (matching full Outlook view behavior)
const limitImagesInHtml = (html: string, maxImages: number = 2): string => {
  if (!html) return '';
  
  // Find all img tags
  const imgMatches = html.match(/<img[^>]*>/gi);
  if (!imgMatches || imgMatches.length <= maxImages) {
    return html; // No need to limit if we have 2 or fewer images
  }
  
  // Count images and replace excess ones with placeholders
  let imageCount = 0;
  let processedHtml = html;
  
  processedHtml = processedHtml.replace(/<img[^>]*>/gi, (match) => {
    imageCount++;
    if (imageCount <= maxImages) {
      return match; // Keep the first 2 images
    } else {
      // Replace excess images with a placeholder
      return `<div style="
        display: inline-block;
        width: 100px;
        height: 60px;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        text-align: center;
        line-height: 60px;
        font-size: 12px;
        color: #6b7280;
        margin: 4px;
      ">Image ${imageCount}</div>`;
    }
  });
  
  return processedHtml;
};

// Simplified HTML sanitization using DOMPurify
const sanitizeHtml = (html: string, limitImages: boolean = true): string => {
  if (!html) return '';
  
  // First sanitize MSO tags
  const msoSanitized = sanitizeMsoTags(html);
  
  // Limit images if requested (for overview display)
  const imageLimitedHtml = limitImages ? limitImagesInHtml(msoSanitized, 2) : msoSanitized;
  
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
    ALLOW_UNKNOWN_PROTOCOLS: true, // Allow data: URLs for embedded images
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false
  };
  
  return DOMPurify.sanitize(imageLimitedHtml, config);
};

interface TruncatedEmailDisplayProps {
  emailLog: {
    id: string;
    htmlBody?: string;
    body?: string;
    isTruncated?: boolean;
    originalContentLength?: number;
    truncatedContentLength?: number;
    from: string;
    to: string;
    subject?: string;
    receivedAt?: string;
    rawMeta?: any;
  };
  className?: string;
  disableTruncation?: boolean; // New prop to disable truncation functionality
  hideViewModeButtons?: boolean; // New prop to hide view mode buttons
  viewMode?: 'formatted' | 'database' | 'imap'; // External view mode control
  disableImageLimiting?: boolean; // New prop to disable image limiting
}

// Extract HTML from raw IMAP source (only used when viewMode is 'imap')
const getRawHtmlFromSource = (rawMeta: any): string => {
  if (!rawMeta) return '';
  
  try {
    let meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
    if (meta && meta.source) {
      const rawSource = Buffer.from(meta.source, 'base64').toString('utf-8');
      
      // Look for HTML content in the raw source
      const htmlMatch = rawSource.match(/Content-Type: text\/html[^]*?(\r?\n\r?\n)([^]*?)(\r?\n\r?\n|---|$)/i);
      if (htmlMatch) {
        return htmlMatch[2].trim();
      }
      
      // Fallback: look for any HTML-like content
      const htmlContentMatch = rawSource.match(/<html[^]*?<\/html>/i);
      if (htmlContentMatch) {
        return htmlContentMatch[0];
      }
      
      return rawSource; // Return full source if no HTML found
    }
  } catch (e) {
    console.log('Error parsing rawMeta:', e);
  }
  return '';
};

export const TruncatedEmailDisplay: React.FC<TruncatedEmailDisplayProps> = ({
  emailLog,
  className = '',
  disableTruncation = false,
  hideViewModeButtons = false,
  viewMode: externalViewMode,
  disableImageLimiting = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalViewMode, setInternalViewMode] = useState<'formatted' | 'database' | 'imap'>('formatted');
  
  // Use external view mode if provided, otherwise use internal state
  const viewMode = externalViewMode || internalViewMode;
  const setViewMode = externalViewMode ? () => {} : setInternalViewMode;
  
  // Get raw IMAP HTML (only used for IMAP source view mode)
  const rawImapHtml = getRawHtmlFromSource(emailLog.rawMeta);
  
  const rawContent = emailLog.htmlBody || emailLog.body || '';
  const { cleanContent, threadInfo } = parseEmailThreads(rawContent);
  const content = cleanContent;
  const isTruncated = disableTruncation ? false : (emailLog.isTruncated || false);
  
  // Basic logging for debugging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('TruncatedEmailDisplay - Email:', {
      id: emailLog.id,
      subject: emailLog.subject,
      htmlBodyLength: emailLog.htmlBody?.length || 0,
      bodyLength: emailLog.body?.length || 0,
      isTruncated
    });
  }
  
  // If not truncated, show full content
  if (!isTruncated) {
    return (
      <div className={`email-content ${className}`}>
        {/* View Toggle Buttons */}
        {!hideViewModeButtons && (
          <div className="flex gap-2 mb-3">
            <Button
              variant={viewMode === 'formatted' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('formatted')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Formatted
            </Button>
            <Button
              variant={viewMode === 'database' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('database')}
            >
              <Code className="h-4 w-4 mr-1" />
              Database HTML
            </Button>
            <Button
              variant={viewMode === 'imap' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('imap')}
              disabled={!rawImapHtml}
            >
              <Code className="h-4 w-4 mr-1" />
              IMAP Source
            </Button>
          </div>
        )}


      {viewMode === 'formatted' ? (
        emailLog.htmlBody ? (
          <div 
            className="prose prose-sm max-w-none email-html-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content, !disableImageLimiting) }}
            style={{
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {content}
          </div>
        )
        ) : viewMode === 'database' ? (
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="text-xs text-gray-500 mb-2">Database HTML Content:</div>
            <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
              {content}
            </pre>
          </div>
        ) : (
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="text-xs text-gray-500 mb-2">IMAP Source HTML:</div>
            <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
              {rawImapHtml || 'No IMAP source available'}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // If truncated, show truncated content with expand option
  return (
    <div className={`email-content ${className}`}>
      {/* View Toggle Buttons */}
      {!hideViewModeButtons && (
        <div className="flex gap-2 mb-3">
          <Button
            variant={viewMode === 'formatted' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('formatted')}
          >
            <Eye className="h-4 w-4 mr-1" />
            Formatted
          </Button>
          <Button
            variant={viewMode === 'database' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('database')}
          >
            <Code className="h-4 w-4 mr-1" />
            Database HTML
          </Button>
          <Button
            variant={viewMode === 'imap' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('imap')}
            disabled={!rawImapHtml}
          >
            <Code className="h-4 w-4 mr-1" />
            IMAP Source
          </Button>
        </div>
      )}


      {viewMode === 'formatted' ? (
        emailLog.htmlBody ? (
          <div 
            className="prose prose-sm max-w-none email-html-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content, !disableImageLimiting) }}
            style={{
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {content}
          </div>
        )
      ) : viewMode === 'database' ? (
        <div className="border rounded-md p-4 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">Database HTML Content:</div>
          <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
            {content}
          </pre>
        </div>
      ) : (
        <div className="border rounded-md p-4 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">IMAP Source HTML:</div>
          <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
            {rawImapHtml || 'No IMAP source available'}
          </pre>
        </div>
      )}
      
      {isTruncated && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Content truncated ({emailLog.truncatedContentLength || 0} of {emailLog.originalContentLength || 0} characters shown)
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show More
                </>
              )}
            </Button>
          </div>
          
          {isExpanded && (
            <div className="mt-3 p-3 bg-muted/30 rounded border">
              <div className="text-xs text-muted-foreground mb-2">
                Full content ({emailLog.originalContentLength || 0} characters):
              </div>
              <div className="max-h-96 overflow-y-auto">
                {emailLog.htmlBody ? (
                  <div 
                    className="prose prose-sm max-w-none email-html-content"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(emailLog.htmlBody, false) }}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {emailLog.body}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
