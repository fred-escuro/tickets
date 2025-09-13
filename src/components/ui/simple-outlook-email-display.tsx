import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './card';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { 
  Mail, 
  Calendar, 
  User, 
  Users, 
  Eye,
  Code,
  Download,
  Maximize2,
  Copy,
  Printer,
  Loader2
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { apiClient } from '@/lib/api';
// Email parsing using backend mailparser service

interface SimpleOutlookEmailDisplayProps {
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
    processedAt?: string | Date;
    imap_raw?: string;
    rawMeta?: any;
  };
  ticketId?: string;
  trigger?: React.ReactNode;
}

export const SimpleOutlookEmailDisplay: React.FC<SimpleOutlookEmailDisplayProps> = ({ 
  emailLog, 
  ticketId,
  trigger 
}) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw' | 'source'>('formatted');
  const [isOpen, setIsOpen] = useState(false);
  const [fullEmailContent, setFullEmailContent] = useState<any>(null);
  const [isLoadingFullContent, setIsLoadingFullContent] = useState(false);
  const [parsedContent, setParsedContent] = useState<string>('');
  const [isParsingContent, setIsParsingContent] = useState(false);

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const fetchFullEmailContent = async () => {
    if (!ticketId || fullEmailContent || isLoadingFullContent) return;
    
    setIsLoadingFullContent(true);
    try {
      const response = await apiClient.get(`/api/tickets/${ticketId}/emails/${emailLog.id}/full`);
      if (response.success) {
        setFullEmailContent(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch full email content:', error);
    } finally {
      setIsLoadingFullContent(false);
    }
  };

  // Fetch full content when dialog opens
  useEffect(() => {
    if (isOpen && ticketId) {
      fetchFullEmailContent();
    }
  }, [isOpen, ticketId]);

  // Parse content when view mode or email data changes
  useEffect(() => {
    const parseContent = async () => {
      if (!isOpen) return;
      
      setIsParsingContent(true);
      try {
        const content = await getDisplayContent();
        setParsedContent(content);
      } catch (error) {
        console.error('Error parsing email content:', error);
        setParsedContent('Error parsing email content');
      } finally {
        setIsParsingContent(false);
      }
    };

    parseContent();
  }, [isOpen, viewMode, fullEmailContent, emailLog]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const printEmail = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const content = emailLog.htmlBody || emailLog.body || 'No content available';
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email: ${emailLog.subject}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
            .email-container { max-width: 800px; margin: 0 auto; }
            .email-headers { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .email-content { padding: 20px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-headers">
              <h2>${emailLog.subject || 'No Subject'}</h2>
              <p><strong>From:</strong> ${emailLog.from}</p>
              <p><strong>To:</strong> ${emailLog.to}</p>
              ${emailLog.cc ? `<p><strong>CC:</strong> ${emailLog.cc}</p>` : ''}
              <p><strong>Date:</strong> ${formatDate(emailLog.receivedAt)}</p>
            </div>
            <div class="email-content">
              ${content}
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Maximize2 className="h-4 w-4" />
      Full Outlook View
    </Button>
  );

  const parseEmailWithBackend = async (rawEmailData: string): Promise<string> => {
    try {
      // Call backend email parsing endpoint
      const response = await apiClient.post('/api/email-logs/parse', {
        rawEmailData
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to parse email on backend');
      }

      const parsed = response.data as {
        from: string;
        to: string;
        subject: string;
        date: string;
        htmlContent: string | null;
        textContent: string | null;
        attachments: Array<{
          filename: string;
          contentType: string;
          size: number;
          contentId: string | null;
        }>;
        headers: {
          messageId: string;
          inReplyTo: string | null;
          references: string | null;
          cc: string | null;
          bcc: string | null;
          replyTo: string | null;
        };
      };
      
      // Handle attachments if any
      let attachmentsHtml = '';
      if (parsed.attachments && parsed.attachments.length > 0) {
        attachmentsHtml = `
          <div class="email-attachments" style="
            margin-top: 16px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          ">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Attachments:</h4>
            <ul style="margin: 0; padding-left: 16px;">
              ${parsed.attachments.map((att: any) => `
                <li style="margin: 4px 0;">
                  <span style="font-family: monospace; color: #6b7280;">${att.filename || 'Unknown file'}</span>
                  <span style="color: #9ca3af; font-size: 12px;">(${att.contentType || 'unknown type'})</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }

      // Get the best available content (prefer HTML over text)
      let content = parsed.htmlContent || parsed.textContent || 'No content available';
      
      // If we have HTML content, sanitize it
      if (parsed.htmlContent) {
        content = DOMPurify.sanitize(parsed.htmlContent, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'hr', 'sub', 'sup', 'small', 'mark', 'del', 'ins'
          ],
          ALLOWED_ATTR: [
            'href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id', 'style',
            'target', 'rel', 'colspan', 'rowspan', 'align', 'valign'
          ]
        });
      }

      // Create the formatted email structure
      return `
        <div class="parsed-email" style="
          border: 1px solid #d1d5db;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        ">
          <div class="email-header" style="
            background: #f9fafb;
            padding: 16px;
            border-bottom: 1px solid #e5e7eb;
          ">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; font-size: 14px;">
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #374151; min-width: 50px;">From:</span>
                <span style="color: #6b7280; font-family: monospace;">${parsed.from}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #374151; min-width: 50px;">Date:</span>
                <span style="color: #6b7280;">${new Date(parsed.date).toLocaleString()}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #374151; min-width: 50px;">To:</span>
                <span style="color: #6b7280;">${parsed.to}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #374151; min-width: 70px;">Subject:</span>
                <span style="color: #6b7280; font-weight: 500;">${parsed.subject}</span>
              </div>
            </div>
          </div>
          <div class="email-content" style="
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #374151;
          ">
            ${content}
            ${attachmentsHtml}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error parsing email with backend:', error);
      // Fallback to original content if parsing fails
      return `<div class="email-fallback" style="
        padding: 20px; 
        background: #f9fafb; 
        border-radius: 6px; 
        white-space: pre-wrap;
        border: 1px solid #d1d5db;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #374151;
      ">${rawEmailData}</div>`;
    }
  };

  const getDisplayContent = async () => {
    const emailData = fullEmailContent || emailLog;
    
    switch (viewMode) {
      case 'raw':
        return emailData.htmlBody || emailData.body || 'No content available';
      case 'source':
        if (emailData.imap_raw) {
          try {
            // Use browser's atob() to decode base64 string
            return atob(emailData.imap_raw);
          } catch (error) {
            console.error('Failed to decode IMAP raw data:', error);
            return 'Error decoding IMAP source data';
          }
        }
        return 'No IMAP source available';
      default:
        // Use backend mailparser when we have IMAP raw data
        if (emailData.imap_raw) {
          try {
            const decodedRawData = atob(emailData.imap_raw);
            return await parseEmailWithBackend(decodedRawData);
          } catch (error) {
            console.error('Failed to parse email with backend:', error);
            // Fallback to regular content
            const content = emailData.htmlBody || emailData.body || 'No content available';
            return content;
          }
        } else {
          // Fallback for when we don't have raw IMAP data
          const content = emailData.htmlBody || emailData.body || 'No content available';
          return content;
        }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent 
        className="!max-w-[60vw] !w-[60vw] sm:!max-w-[60vw] lg:!max-w-[60vw] xl:!max-w-[60vw] max-h-[95vh] overflow-hidden flex flex-col"
        style={{ maxWidth: '60vw', width: '60vw' }}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {emailLog.subject || 'Email View'}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(parsedContent)}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={printEmail}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-1">
          <div className="space-y-4">
            {/* View Mode Controls */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">View Mode:</span>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'formatted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('formatted')}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Formatted
                </Button>
                <Button
                  variant={viewMode === 'raw' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('raw')}
                  className="gap-2"
                >
                  <Code className="h-4 w-4" />
                  Raw HTML
                </Button>
                <Button
                  variant={viewMode === 'source' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('source')}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  IMAP Source
                </Button>
              </div>
            </div>

            {/* Email Content */}
            <Card className="border-l-4 border-l-blue-500">
              {viewMode === 'formatted' && (
                <>
                  {/* Email Headers */}
                  <CardHeader className="bg-muted/50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">From:</span>
                          <span className="truncate">{(fullEmailContent || emailLog).from}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">To:</span>
                          <span className="truncate">{(fullEmailContent || emailLog).to}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(fullEmailContent || emailLog).cc && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">CC:</span>
                            <span className="truncate">{(fullEmailContent || emailLog).cc}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Subject:</span>
                          <span className="truncate">{(fullEmailContent || emailLog).subject}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Date:</span>
                          <span>{formatDate((fullEmailContent || emailLog).receivedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Email Body */}
                  <CardContent className="p-6">
                    {isLoadingFullContent || isParsingContent ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>
                          {isLoadingFullContent ? 'Loading full email content...' : 'Parsing email content...'}
                        </span>
                      </div>
                    ) : (
                      <div 
                        className="prose prose-sm max-w-none max-h-[60vh] overflow-y-auto"
                        dangerouslySetInnerHTML={{ 
                          __html: viewMode === 'formatted' && parsedContent.includes('<div class="parsed-email"') 
                            ? parsedContent 
                            : DOMPurify.sanitize(parsedContent)
                        }}
                      />
                    )}
                  </CardContent>
                </>
              )}

              {(viewMode === 'raw' || viewMode === 'source') && (
                <CardContent className="p-6">
                  {isParsingContent ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Parsing email content...</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[60vh]">
                      {parsedContent}
                    </pre>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
