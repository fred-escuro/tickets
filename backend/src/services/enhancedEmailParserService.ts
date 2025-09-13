import { simpleParser, ParsedMail, Attachment } from 'mailparser';
// @ts-ignore - No type definitions available
import { MimeParser } from 'emailjs-mime-parser';
// @ts-ignore - No type definitions available
import { EmailReplyParser } from 'email-reply-parser';

export interface EnhancedParsedEmail {
  // Basic email info
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  date: Date;
  messageId: string;
  
  // Content
  text: string;
  html: string;
  replyText?: string; // Cleaned reply text
  
  // Attachments
  attachments: EnhancedAttachment[];
  inlineImages: EnhancedAttachment[];
  
  // Raw data
  rawSource: string;
  headers: Record<string, string>;
  
  // Metadata
  isReply: boolean;
  replyDepth: number;
  originalSender?: string;
  threadId?: string;
}

export interface EnhancedAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentId?: string;
  contentDisposition: 'attachment' | 'inline';
  isImage: boolean;
  dataUrl?: string; // For inline images
}

export interface EmailDisplayOptions {
  maxWidth?: number;
  showHeaders?: boolean;
  showAttachments?: boolean;
  showInlineImages?: boolean;
  sanitizeHtml?: boolean;
  preserveFormatting?: boolean;
}

/**
 * Enhanced Email Parser Service
 * Provides Outlook-like email parsing and display capabilities
 */
export class EnhancedEmailParserService {
  
  /**
   * Parse raw email content with comprehensive processing
   */
  static async parseEmail(rawEmail: string | Buffer, options: EmailDisplayOptions = {}): Promise<EnhancedParsedEmail> {
    console.log('🔍 ENHANCED EMAIL PARSER: Starting comprehensive email parsing...');
    console.log(`Raw email type: ${typeof rawEmail}, length: ${rawEmail.length} bytes`);
    
    if (rawEmail.length === 0) {
      throw new Error('Raw email content is empty');
    }
    
    // Parse with mailparser (most comprehensive)
    const parsed = await simpleParser(rawEmail);
    
    console.log('📧 MAILPARSER RESULTS:');
    console.log(`  Subject: ${parsed.subject}`);
    console.log(`  From: ${(parsed.from as any)?.text || 'Unknown'}`);
    console.log(`  To: ${(parsed.to as any)?.text || 'Unknown'}`);
    console.log(`  Date: ${parsed.date}`);
    console.log(`  Text length: ${parsed.text?.length || 0}`);
    console.log(`  HTML length: ${typeof parsed.html === 'string' ? parsed.html.length : 0}`);
    console.log(`  Attachments: ${parsed.attachments?.length || 0}`);
    
    // Process attachments
    const { attachments, inlineImages } = this.processAttachments(parsed.attachments || []);
    
    // Process HTML content
    const processedHtml = await this.processHtmlContent(parsed.html || '', inlineImages, options);
    
    // Process text content
    const processedText = this.processTextContent(parsed.text || '');
    
    // Extract reply information
    const replyInfo = this.extractReplyInfo(processedText);
    
    // Extract headers
    const headers = this.extractHeaders(parsed);
    
    const result: EnhancedParsedEmail = {
      subject: parsed.subject || 'No Subject',
      from: this.formatAddress(parsed.from),
      to: this.formatAddress(parsed.to),
      cc: this.formatAddress(parsed.cc),
      bcc: this.formatAddress(parsed.bcc),
      date: parsed.date || new Date(),
      messageId: parsed.messageId || '',
      text: processedText,
      html: processedHtml,
      replyText: replyInfo.cleanText,
      attachments,
      inlineImages,
      rawSource: rawEmail.toString(),
      headers,
      isReply: replyInfo.isReply,
      replyDepth: replyInfo.depth,
      originalSender: replyInfo.originalSender,
      threadId: this.generateThreadId(parsed)
    };
    
    console.log('✅ ENHANCED PARSING COMPLETE:');
    console.log(`  Processed HTML length: ${processedHtml.length}`);
    console.log(`  Attachments: ${attachments.length}`);
    console.log(`  Inline images: ${inlineImages.length}`);
    console.log(`  Is reply: ${replyInfo.isReply}`);
    
    return result;
  }
  
  /**
   * Process attachments and separate inline images
   */
  private static processAttachments(attachments: Attachment[]): { attachments: EnhancedAttachment[], inlineImages: EnhancedAttachment[] } {
    const processedAttachments: EnhancedAttachment[] = [];
    const inlineImages: EnhancedAttachment[] = [];
    
    attachments.forEach((att, index) => {
      const enhancedAtt: EnhancedAttachment = {
        id: `att_${index}_${Date.now()}`,
        filename: att.filename || `attachment_${index}`,
        contentType: att.contentType || 'application/octet-stream',
        size: att.content?.length || 0,
        content: att.content as Buffer,
        contentId: att.contentId,
        contentDisposition: att.contentDisposition as 'attachment' | 'inline',
        isImage: this.isImageType(att.contentType || ''),
        dataUrl: undefined
      };
      
      // Create data URL for inline images
      if (enhancedAtt.isImage && att.contentDisposition === 'inline' && att.content) {
        const base64 = (att.content as Buffer).toString('base64');
        enhancedAtt.dataUrl = `data:${att.contentType};base64,${base64}`;
        inlineImages.push(enhancedAtt);
      } else {
        processedAttachments.push(enhancedAtt);
      }
    });
    
    return { attachments: processedAttachments, inlineImages };
  }
  
  /**
   * Process HTML content with Outlook-like formatting
   */
  private static async processHtmlContent(html: string, inlineImages: EnhancedAttachment[], options: EmailDisplayOptions): Promise<string> {
    if (!html) return '';
    
    console.log('🔧 PROCESSING HTML CONTENT:');
    console.log(`Original HTML length: ${html.length}`);
    
    let processedHtml = html;
    
    // 1. Clean MSO/Outlook specific tags
    processedHtml = this.cleanMsoTags(processedHtml);
    
    // 2. Convert VML images to regular img tags
    processedHtml = this.convertVmlImages(processedHtml, inlineImages);
    
    // 3. Fix malformed HTML
    processedHtml = this.fixMalformedHtml(processedHtml);
    
    // 4. Apply Outlook-like styling
    if (options.preserveFormatting !== false) {
      processedHtml = this.applyOutlookStyling(processedHtml, options);
    }
    
    // 5. Sanitize HTML if requested
    if (options.sanitizeHtml !== false) {
      processedHtml = this.sanitizeHtml(processedHtml);
    }
    
    console.log(`Processed HTML length: ${processedHtml.length}`);
    
    return processedHtml;
  }
  
  /**
   * Clean Microsoft Office specific tags and attributes
   */
  private static cleanMsoTags(html: string): string {
    let cleaned = html;
    
    // Remove MSO conditional comments
    cleaned = cleaned.replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, '');
    
    // Remove MSO-specific tags
    cleaned = cleaned.replace(/<\/?o:p[^>]*>/gis, '');
    cleaned = cleaned.replace(/<\/?w:[^>]*>/gis, '');
    
    // Remove MSO-specific attributes
    cleaned = cleaned.replace(/\s*mso-[^;=]*[;"]/gi, '');
    cleaned = cleaned.replace(/\s*MsoNormal[^"'\s]*/gi, '');
    cleaned = cleaned.replace(/\s*MsoListParagraph[^"'\s]*/gi, '');
    cleaned = cleaned.replace(/\s*MsoListTable[^"'\s]*/gi, '');
    
    // Remove MSO-specific XML namespaces
    cleaned = cleaned.replace(/\s*xmlns:o="urn:schemas-microsoft-com:office:office"/gi, '');
    cleaned = cleaned.replace(/\s*xmlns:w="urn:schemas-microsoft-com:office:word"/gi, '');
    
    // Clean up empty attributes
    cleaned = cleaned.replace(/style="\s*"/gi, '');
    cleaned = cleaned.replace(/class="\s*"/gi, '');
    cleaned = cleaned.replace(/\s+>/gi, '>');
    
    return cleaned;
  }
  
  /**
   * Convert VML images to regular img tags
   */
  private static convertVmlImages(html: string, inlineImages: EnhancedAttachment[]): string {
    let converted = html;
    
    // Convert VML imagedata tags to img tags
    inlineImages.forEach(img => {
      if (img.contentId && img.dataUrl) {
        const contentId = img.contentId.replace(/[<>]/g, '');
        
        // Pattern 1: Direct cid: references
        const cidPattern = new RegExp(`cid:${contentId}`, 'gi');
        converted = converted.replace(cidPattern, img.dataUrl);
        
        // Pattern 2: VML imagedata references
        const vmlPattern = new RegExp(`<v:imagedata[^>]*src\\s*=\\s*["']?cid:${contentId}["']?[^>]*>`, 'gi');
        converted = converted.replace(vmlPattern, `<img src="${img.dataUrl}" alt="${img.filename}" style="max-width: 100%; height: auto;">`);
        
        // Pattern 3: Microsoft Word image structures
        const wordPattern = new RegExp(`<o:picture[^>]*>.*?<v:imagedata[^>]*src\\s*=\\s*["']?cid:${contentId}["']?[^>]*>.*?</o:picture>`, 'gis');
        converted = converted.replace(wordPattern, `<img src="${img.dataUrl}" alt="${img.filename}" style="max-width: 100%; height: auto;">`);
      }
    });
    
    return converted;
  }
  
  /**
   * Fix malformed HTML from email clients
   */
  private static fixMalformedHtml(html: string): string {
    let fixed = html;
    
    // Fix common malformed patterns
    fixed = fixed.replace(/<p[^>]*\s+src="([^"]*)"[^>]*>/gi, '<p><img src="$1" alt="Embedded Image">');
    fixed = fixed.replace(/<p[^>]*>\s*([^<]+)<\/span><\/p>/gi, '<p>$1</p>');
    fixed = fixed.replace(/<p class=\s+([^>]*?)>/gi, '<p class="$1">');
    fixed = fixed.replace(/<p[^>]*id="Picture[^"]*"[^>]*>\s*src="([^"]*)"/gi, '<p><img src="$1" alt="Embedded Image">');
    fixed = fixed.replace(/<p[^>]*>\s*src="([^"]*)"/gi, '<p><img src="$1" alt="Embedded Image">');
    
    // Clean up empty elements
    fixed = fixed.replace(/<p[^>]*>\s*<\/p>/gi, '');
    fixed = fixed.replace(/<div[^>]*>\s*<\/div>/gi, '');
    fixed = fixed.replace(/<span[^>]*>\s*<\/span>/gi, '');
    
    return fixed;
  }
  
  /**
   * Apply Outlook-like styling to HTML content
   */
  private static applyOutlookStyling(html: string, options: EmailDisplayOptions): string {
    const maxWidth = options.maxWidth || 800;
    
    // Wrap content in a styled container
    const styledHtml = `
      <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
        max-width: ${maxWidth}px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        ${html}
      </div>
    `;
    
    return styledHtml;
  }
  
  /**
   * Sanitize HTML content for safe display
   */
  private static sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a proper sanitization library
    let sanitized = html;
    
    // Remove potentially dangerous tags
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed[^>]*>/gi, '');
    
    // Remove dangerous attributes
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*javascript\s*:/gi, '');
    
    return sanitized;
  }
  
  /**
   * Process text content
   */
  private static processTextContent(text: string): string {
    if (!text) return '';
    
    // Clean up text content
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }
  
  /**
   * Extract reply information from email content
   */
  private static extractReplyInfo(text: string): { isReply: boolean; depth: number; originalSender?: string; cleanText: string } {
    try {
      const parser = new EmailReplyParser();
      const reply = parser.read(text);
      
      return {
        isReply: reply.getFragments().length > 1,
        depth: reply.getFragments().length - 1,
        originalSender: reply.getFragments()[0]?.getSender(),
        cleanText: reply.getVisibleText()
      };
    } catch (error) {
      console.log('Error parsing reply:', error);
      return {
        isReply: false,
        depth: 0,
        cleanText: text
      };
    }
  }
  
  /**
   * Extract email headers
   */
  private static extractHeaders(parsed: ParsedMail): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (parsed.headers) {
      for (const [key, value] of parsed.headers) {
        headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }
    
    return headers;
  }
  
  /**
   * Format email address
   */
  private static formatAddress(address: any): string {
    if (!address) return '';
    
    if (typeof address === 'string') return address;
    
    if (Array.isArray(address)) {
      return address.map(addr => this.formatAddress(addr)).join(', ');
    }
    
    if (address.text) return address.text;
    if (address.address) return address.address;
    
    return String(address);
  }
  
  /**
   * Check if content type is an image
   */
  private static isImageType(contentType: string): boolean {
    return contentType.startsWith('image/');
  }
  
  /**
   * Generate thread ID for email threading
   */
  private static generateThreadId(parsed: ParsedMail): string {
    // Use In-Reply-To or References header if available
    const inReplyTo = parsed.headers?.get('in-reply-to');
    const references = parsed.headers?.get('references');
    
    if (inReplyTo) return String(inReplyTo);
    if (references) return String(references).split(' ')[0];
    
    // Fallback to message ID
    return parsed.messageId || `thread_${Date.now()}`;
  }
  
  /**
   * Create email display HTML with all features
   */
  static async createEmailDisplayHtml(parsedEmail: EnhancedParsedEmail, options: EmailDisplayOptions = {}): Promise<string> {
    const {
      showHeaders = true,
      showAttachments = true,
      showInlineImages = true,
      maxWidth = 800
    } = options;
    
    let html = '';
    
    // Email container
    html += `<div class="email-container" style="max-width: ${maxWidth}px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">`;
    
    // Headers section
    if (showHeaders) {
      html += this.createHeadersHtml(parsedEmail);
    }
    
    // Content section
    html += `<div class="email-content" style="padding: 20px; background: #ffffff; border: 1px solid #e1e5e9; border-radius: 8px; margin: 10px 0;">`;
    html += parsedEmail.html;
    html += `</div>`;
    
    // Attachments section
    if (showAttachments && parsedEmail.attachments.length > 0) {
      html += this.createAttachmentsHtml(parsedEmail.attachments);
    }
    
    // Inline images section (if not already embedded)
    if (showInlineImages && parsedEmail.inlineImages.length > 0) {
      html += this.createInlineImagesHtml(parsedEmail.inlineImages);
    }
    
    html += `</div>`;
    
    return html;
  }
  
  /**
   * Create headers HTML
   */
  private static createHeadersHtml(parsedEmail: EnhancedParsedEmail): string {
    return `
      <div class="email-headers" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; font-size: 14px;">
        <div style="margin-bottom: 8px;"><strong>From:</strong> ${parsedEmail.from}</div>
        <div style="margin-bottom: 8px;"><strong>To:</strong> ${parsedEmail.to}</div>
        ${parsedEmail.cc ? `<div style="margin-bottom: 8px;"><strong>CC:</strong> ${parsedEmail.cc}</div>` : ''}
        <div style="margin-bottom: 8px;"><strong>Subject:</strong> ${parsedEmail.subject}</div>
        <div style="margin-bottom: 8px;"><strong>Date:</strong> ${parsedEmail.date.toLocaleString()}</div>
        ${parsedEmail.isReply ? `<div style="margin-bottom: 8px;"><strong>Reply Depth:</strong> ${parsedEmail.replyDepth}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * Create attachments HTML
   */
  private static createAttachmentsHtml(attachments: EnhancedAttachment[]): string {
    let html = `
      <div class="email-attachments" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
        <h4 style="margin: 0 0 10px 0; font-size: 16px;">Attachments (${attachments.length})</h4>
        <div style="display: grid; gap: 10px;">
    `;
    
    attachments.forEach(att => {
      const sizeKB = Math.round(att.size / 1024);
      html += `
        <div style="display: flex; align-items: center; padding: 10px; background: #ffffff; border: 1px solid #e1e5e9; border-radius: 4px;">
          <div style="margin-right: 10px; font-size: 20px;">📎</div>
          <div style="flex: 1;">
            <div style="font-weight: 500;">${att.filename}</div>
            <div style="font-size: 12px; color: #666;">${att.contentType} • ${sizeKB} KB</div>
          </div>
        </div>
      `;
    });
    
    html += `</div></div>`;
    return html;
  }
  
  /**
   * Create inline images HTML
   */
  private static createInlineImagesHtml(inlineImages: EnhancedAttachment[]): string {
    let html = `
      <div class="email-inline-images" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
        <h4 style="margin: 0 0 10px 0; font-size: 16px;">Inline Images (${inlineImages.length})</h4>
        <div style="display: grid; gap: 10px;">
    `;
    
    inlineImages.forEach(img => {
      if (img.dataUrl) {
        html += `
          <div style="text-align: center; padding: 10px; background: #ffffff; border: 1px solid #e1e5e9; border-radius: 4px;">
            <img src="${img.dataUrl}" alt="${img.filename}" style="max-width: 100%; height: auto; border-radius: 4px;">
            <div style="font-size: 12px; color: #666; margin-top: 5px;">${img.filename}</div>
          </div>
        `;
      }
    });
    
    html += `</div></div>`;
    return html;
  }
}
