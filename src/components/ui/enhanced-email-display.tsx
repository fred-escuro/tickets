import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Separator } from './separator';
import { 
  Mail, 
  Calendar, 
  User, 
  Users, 
  Eye,
  Code,
  ChevronDown,
  ChevronUp,
  Reply,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

// Simplified interfaces for basic email display
interface BasicEmailData {
  subject: string;
  from: string;
  to: string;
  cc?: string;
  date: Date;
  messageId: string;
  text: string;
  html: string;
}

interface EmailDisplayOptions {
  maxWidth?: number;
  showHeaders?: boolean;
  showAttachments?: boolean;
  showInlineImages?: boolean;
  sanitizeHtml?: boolean;
  preserveFormatting?: boolean;
  disableExpansion?: boolean; // New option to disable expand/collapse functionality
}

interface EnhancedEmailDisplayProps {
  emailLog: {
    id: string;
    messageId?: string;
    from: string;
    to: string;
    cc?: string;
    subject?: string;
    body?: string;
    htmlBody?: string;
    receivedAt: string;
    processedAt?: string;
    imap_raw?: string;
    rawMeta?: any;
  };
  options?: EmailDisplayOptions;
  className?: string;
}

// Enhanced HTML sanitization with better image handling
const sanitizeHtmlEnhanced = (html: string): string => {
  if (!html) return '';
  
  // Configure DOMPurify for email content
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'sub', 'sup', 'small', 'mark', 'del', 'ins',
      // Allow VML tags for embedded images
      'v:imagedata', 'v:shape', 'v:path', 'v:formulas', 'v:f', 'v:stroke', 'v:fill'
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
  
  return DOMPurify.sanitize(html, config);
};

// Simplified email processing
const processEmailData = (emailLog: any): BasicEmailData => {
  return {
    subject: emailLog.subject || 'No Subject',
    from: emailLog.from,
    to: emailLog.to,
    cc: emailLog.cc,
    date: new Date(emailLog.receivedAt),
    messageId: emailLog.messageId || '',
    text: emailLog.body || '',
    html: emailLog.htmlBody || ''
  };
};


export const EnhancedEmailDisplay: React.FC<EnhancedEmailDisplayProps> = ({
  emailLog,
  options = {},
  className
}) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw' | 'source'>('formatted');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    maxWidth = 800,
    showHeaders = true,
    showInlineImages = true,
    sanitizeHtml = true,
    disableExpansion = false,
  } = options;
  
  // Process email data
  const processedEmail = processEmailData(emailLog);
  
  const content = emailLog.htmlBody || emailLog.body || '';
  const sanitizedContent = sanitizeHtml ? sanitizeHtmlEnhanced(content) : content;
  
  return (
    <div className={cn('enhanced-email-display', className)} style={{ maxWidth: `${maxWidth}px` }}>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="space-y-3">
            {/* Subject and Actions */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                {processedEmail.subject}
              </CardTitle>
              <div className="flex items-center gap-2">
                {processedEmail.isReply && (
                  <Badge variant="outline" className="text-xs">
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {processedEmail.replyDepth > 0 ? `Depth ${processedEmail.replyDepth}` : 'Original'}
                </Badge>
                {emailLog.imap_raw && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // This will be handled by the parent component
                      console.log('Opening full outlook view...');
                    }}
                    className="gap-1"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Full View
                  </Button>
                )}
              </div>
            </div>
            
            {/* Headers */}
            {showHeaders && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">From:</span>
                  <span className="truncate">{processedEmail.from}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">To:</span>
                  <span className="truncate">{processedEmail.to}</span>
                </div>
                
                {processedEmail.cc && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">CC:</span>
                    <span className="truncate">{processedEmail.cc}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 md:col-span-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Received:</span>
                  <span>{processedEmail.date.toLocaleString()}</span>
                </div>
              </div>
            )}
            
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'formatted' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('formatted')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Formatted
              </Button>
              <Button
                variant={viewMode === 'raw' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('raw')}
              >
                <Code className="h-4 w-4 mr-1" />
                Raw HTML
              </Button>
              <Button
                variant={viewMode === 'source' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('source')}
                disabled={!emailLog.imap_raw}
              >
                <Code className="h-4 w-4 mr-1" />
                IMAP Source
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          
          {/* Content Display */}
          {viewMode === 'formatted' ? (
            <div className="email-content-container">
              <div 
                className="prose prose-sm max-w-none email-html-content"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                style={{
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                }}
              />
            </div>
          ) : viewMode === 'raw' ? (
            <div className="border rounded-md p-4 bg-gray-50">
              <div className="text-xs text-gray-500 mb-2">Raw HTML Content:</div>
              <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                {content}
              </pre>
            </div>
          ) : (
            <div className="border rounded-md p-4 bg-gray-50">
              <div className="text-xs text-gray-500 mb-2">IMAP Source:</div>
              <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                {emailLog.imap_raw ? Buffer.from(emailLog.imap_raw, 'base64').toString('utf-8') : 'No IMAP source available'}
              </pre>
            </div>
          )}
          
          {/* Embedded Images - Only show if enabled */}
          {showInlineImages && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <div className="text-sm text-muted-foreground">
                Images are displayed inline with the content
              </div>
            </div>
          )}
          
          {/* Expandable Content */}
          {!disableExpansion && content.length > 1000 && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show Full Content
                  </>
                )}
              </Button>
              
              {isExpanded && (
                <div className="mt-4 p-4 bg-muted/30 rounded border">
                  <div className="text-xs text-muted-foreground mb-2">
                    Full content ({content.length} characters):
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div 
                      className="prose prose-sm max-w-none email-html-content"
                      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Enhanced Email Styles */}
      <style>{`
        .email-html-content {
          color: inherit;
        }
        
        .email-html-content :global(p) {
          margin: 0.5rem 0;
        }
        
        .email-html-content :global(blockquote) {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          background-color: #f9fafb;
          padding: 1rem;
          border-radius: 0.25rem;
        }
        
        .email-html-content :global(table) {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          border: 1px solid #e5e7eb;
        }
        
        .email-html-content :global(th),
        .email-html-content :global(td) {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
          text-align: left;
        }
        
        .email-html-content :global(th) {
          background-color: #f9fafb;
          font-weight: 600;
        }
        
        .email-html-content :global(a) {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .email-html-content :global(a:hover) {
          color: #1d4ed8;
        }
        
        .email-html-content :global(ul),
        .email-html-content :global(ol) {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .email-html-content :global(li) {
          margin: 0.25rem 0;
        }
        
        .email-html-content :global(strong),
        .email-html-content :global(b) {
          font-weight: 600;
        }
        
        .email-html-content :global(em),
        .email-html-content :global(i) {
          font-style: italic;
        }
        
        .email-html-content :global(code) {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
        }
        
        .email-html-content :global(pre) {
          background-color: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
          border: 1px solid #e5e7eb;
        }
        
        .email-html-content :global(pre code) {
          background: none;
          padding: 0;
        }
        
        .email-html-content :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: 0.25rem;
          margin: 0.5rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .email-html-content :global(img[src^="data:"]) {
          border: 1px solid #e5e7eb;
          padding: 0.25rem;
          background-color: #f9fafb;
        }
        
        .email-content-container {
          background: #ffffff;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};
