/**
 * Email content truncation utilities
 * Handles truncation of email content based on thread position and length
 */

export interface EmailTruncationOptions {
  maxLength: number;
  preserveFirstEmail: boolean;
  truncationSuffix: string;
}

export const DEFAULT_TRUNCATION_OPTIONS: EmailTruncationOptions = {
  maxLength: 1000, // Characters to show before truncation
  preserveFirstEmail: true, // Always preserve first email in thread
  truncationSuffix: '... [Content truncated - click to expand]'
};

/**
 * Determines if an email should be truncated based on its position in the thread
 */
export function shouldTruncateEmail(
  emailLog: any,
  allEmailsInThread: any[],
  options: EmailTruncationOptions = DEFAULT_TRUNCATION_OPTIONS
): boolean {
  // Always preserve first email if configured
  if (options.preserveFirstEmail) {
    const firstEmail = allEmailsInThread
      .sort((a, b) => new Date(a.receivedAt || a.sentAt).getTime() - new Date(b.receivedAt || b.sentAt).getTime())[0];
    
    if (emailLog.id === firstEmail.id) {
      return false;
    }
  }

  // Check if content is long enough to warrant truncation
  const contentLength = (emailLog.htmlBody || emailLog.body || '').length;
  return contentLength > options.maxLength;
}

/**
 * Truncates email content while preserving HTML structure
 */
export function truncateEmailContent(
  content: string,
  maxLength: number = DEFAULT_TRUNCATION_OPTIONS.maxLength,
  suffix: string = DEFAULT_TRUNCATION_OPTIONS.truncationSuffix
): { content: string; isTruncated: boolean } {
  if (!content || content.length <= maxLength) {
    return { content, isTruncated: false };
  }

  // For HTML content, try to truncate at a safe point (end of tag)
  if (content.includes('<')) {
    const truncated = truncateHtmlContent(content, maxLength);
    return {
      content: truncated + suffix,
      isTruncated: true
    };
  }

  // For plain text, simple truncation
  return {
    content: content.substring(0, maxLength) + suffix,
    isTruncated: true
  };
}

/**
 * Truncates HTML content at a safe point (end of tag)
 */
function truncateHtmlContent(html: string, maxLength: number): string {
  if (html.length <= maxLength) {
    return html;
  }

  // Find the last complete tag before maxLength
  let truncateAt = maxLength;
  const beforeMaxLength = html.substring(0, maxLength);
  
  // Look for the last closing tag
  const lastClosingTag = beforeMaxLength.lastIndexOf('</');
  if (lastClosingTag > maxLength * 0.8) { // If we find a closing tag in the last 20%
    truncateAt = lastClosingTag + beforeMaxLength.substring(lastClosingTag).indexOf('>') + 1;
  } else {
    // Look for the last opening tag to close
    const lastOpeningTag = beforeMaxLength.lastIndexOf('<');
    if (lastOpeningTag > maxLength * 0.8) {
      const tagName = beforeMaxLength.substring(lastOpeningTag + 1, beforeMaxLength.indexOf(' ', lastOpeningTag) || beforeMaxLength.indexOf('>', lastOpeningTag));
      if (tagName && !tagName.includes('/')) {
        truncateAt = lastOpeningTag + beforeMaxLength.substring(lastOpeningTag).indexOf('>') + 1;
        // Add closing tag
        return html.substring(0, truncateAt) + `</${tagName}>`;
      }
    }
  }

  return html.substring(0, truncateAt);
}

/**
 * Gets email thread position information
 */
export function getEmailThreadInfo(emailLog: any, allEmailsInThread: any[]): {
  position: number;
  totalEmails: number;
  isFirstEmail: boolean;
  isLastEmail: boolean;
} {
  const sortedEmails = allEmailsInThread.sort(
    (a, b) => new Date(a.receivedAt || a.sentAt).getTime() - new Date(b.receivedAt || b.sentAt).getTime()
  );
  
  const position = sortedEmails.findIndex(email => email.id === emailLog.id) + 1;
  const totalEmails = sortedEmails.length;
  
  return {
    position,
    totalEmails,
    isFirstEmail: position === 1,
    isLastEmail: position === totalEmails
  };
}

/**
 * Processes email logs for display with truncation
 */
export function processEmailLogsForDisplay(
  emailLogs: any[],
  options: EmailTruncationOptions = DEFAULT_TRUNCATION_OPTIONS
): any[] {
  return emailLogs.map(emailLog => {
    const shouldTruncate = shouldTruncateEmail(emailLog, emailLogs, options);
    
    if (!shouldTruncate) {
      return {
        ...emailLog,
        isTruncated: false,
        originalContentLength: (emailLog.htmlBody || emailLog.body || '').length
      };
    }

    const htmlBody = emailLog.htmlBody;
    const body = emailLog.body;
    
    let processedHtmlBody = htmlBody;
    let processedBody = body;
    let isTruncated = false;

    if (htmlBody) {
      const truncatedHtml = truncateEmailContent(htmlBody, options.maxLength, options.truncationSuffix);
      processedHtmlBody = truncatedHtml.content;
      isTruncated = truncatedHtml.isTruncated;
    }

    if (body && !htmlBody) {
      const truncatedText = truncateEmailContent(body, options.maxLength, options.truncationSuffix);
      processedBody = truncatedText.content;
      isTruncated = truncatedText.isTruncated;
    }

    return {
      ...emailLog,
      htmlBody: processedHtmlBody,
      body: processedBody,
      isTruncated,
      originalContentLength: (htmlBody || body || '').length,
      truncatedContentLength: (processedHtmlBody || processedBody || '').length
    };
  });
}
