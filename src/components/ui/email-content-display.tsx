import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Separator } from './separator';
import { Mail, Calendar, User, Users } from 'lucide-react';
import { TruncatedEmailDisplay } from './truncated-email-display';
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

interface EmailLog {
  id: string;
  from: string;
  to: string;
  cc?: string;
  subject?: string;
  body?: string;
  htmlBody?: string;
  receivedAt: string;
  messageId?: string;
}

interface EmailContentDisplayProps {
  emailLogs: EmailLog[];
}

export const EmailContentDisplay: React.FC<EmailContentDisplayProps> = ({ emailLogs }) => {
  if (!emailLogs || emailLogs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Mail className="h-4 w-4" />
        Email Thread ({emailLogs.length} message{emailLogs.length !== 1 ? 's' : ''})
      </div>
      
      {emailLogs.map((email, index) => (
        <Card key={email.id} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{email.subject || 'No Subject'}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  Message {index + 1}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="font-medium">From:</span>
                  <span className="truncate">{email.from}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="font-medium">To:</span>
                  <span className="truncate">{email.to}</span>
                </div>
                
                {email.cc && (
                  <div className="flex items-center gap-1 md:col-span-2">
                    <Users className="h-3 w-3" />
                    <span className="font-medium">CC:</span>
                    <span className="truncate">{email.cc}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1 md:col-span-2">
                  <Calendar className="h-3 w-3" />
                  <span className="font-medium">Received:</span>
                  <span>{new Date(email.receivedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <Separator className="mb-3" />
            
            <TruncatedEmailDisplay 
              emailLog={{
                id: email.id,
                htmlBody: email.htmlBody,
                body: email.body,
                isTruncated: email.isTruncated,
                originalContentLength: email.originalContentLength,
                truncatedContentLength: email.truncatedContentLength,
                from: email.from,
                to: email.to,
                subject: email.subject,
                receivedAt: email.receivedAt
              }}
            />
          </CardContent>
        </Card>
      ))}
      
      <style jsx>{`
        .email-html-content {
          /* Preserve email styling while ensuring readability */
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
        }
        
        .email-html-content :global(table) {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
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
          /* Embedded images from email */
          border: 1px solid #e5e7eb;
          padding: 0.25rem;
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  );
};
