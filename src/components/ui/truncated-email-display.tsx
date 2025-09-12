import React, { useState } from 'react';
import { Button } from './button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DOMPurify from 'dompurify';

// Robust HTML sanitization using DOMPurify
const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
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
  
  return DOMPurify.sanitize(html, config);
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
  };
  className?: string;
}

export const TruncatedEmailDisplay: React.FC<TruncatedEmailDisplayProps> = ({
  emailLog,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const content = emailLog.htmlBody || emailLog.body || '';
  const isTruncated = emailLog.isTruncated || false;
  
  // If not truncated, show full content
  if (!isTruncated) {
    return (
      <div className={`email-content ${className}`}>
        {emailLog.htmlBody ? (
          <div 
            className="prose prose-sm max-w-none email-html-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
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
        )}
      </div>
    );
  }

  // If truncated, show truncated content with expand option
  return (
    <div className={`email-content ${className}`}>
      {emailLog.htmlBody ? (
        <div 
          className="prose prose-sm max-w-none email-html-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
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
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(emailLog.htmlBody) }}
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
