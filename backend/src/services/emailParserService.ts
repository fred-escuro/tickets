import { simpleParser, ParsedMail } from 'mailparser';

export interface ParsedEmailResult {
  text: string;
  html: string;
  parsed: ParsedMail;
}

/**
 * Clean Outlook-style HTML from an email message
 * @param {string|Buffer} rawEmail - Raw RFC822 source from IMAP
 * @returns {Promise<ParsedEmailResult>}
 */
export async function parseAndCleanEmail(rawEmail: string | Buffer): Promise<ParsedEmailResult> {
  const parsed = await simpleParser(rawEmail);

  let text = parsed.text || "";
  let html = parsed.html || "";

  // Outlook / MS Office conditional comments <!--[if gte mso]>
  html = html.replace(/<!--\[if.*?endif\]-->/gis, "");

  // Outlook <o:p> tags
  html = html.replace(/<\/?o:p[^>]*>/gis, "");

  // Extra cleanup: strip "mso-" styles
  html = html.replace(/mso-[^:]+:[^;"]+;?/gi, "");

  // Remove empty spans/divs created by Outlook
  html = html.replace(/<span[^>]*>\s*<\/span>/gi, "");
  html = html.replace(/<div[^>]*>\s*<\/div>/gi, "");

  return {
    text: text.trim(),
    html: html.trim(),
    parsed
  };
}

/**
 * Convert VML-based embedded images to regular img tags with data URLs
 */
function convertVmlImagesToImgTags(html: string, parsed: ParsedMail): string {
  console.log(`\n🔄 VML CONVERSION FUNCTION:`);
  console.log(`HTML input length: ${html.length}`);
  console.log(`Parsed attachments count: ${parsed.attachments?.length || 0}`);
  
  if (!html || !parsed.attachments) {
    console.log(`❌ No HTML or attachments to process`);
    return html;
  }
  
  // Find inline attachments that might be embedded images
  // Include attachments with 'inline' disposition OR undefined disposition with Content ID
  const inlineImages = parsed.attachments.filter(att => 
    (att.contentDisposition === 'inline' || att.contentDisposition === undefined) && 
    att.contentId && 
    att.content
  );
  
  console.log(`Inline images found: ${inlineImages.length}`);
  
  if (inlineImages.length === 0) {
    console.log(`❌ No inline images to convert`);
    return html;
  }
  
  console.log(`✅ Processing ${inlineImages.length} inline images...`);
  
  let processedHtml = html;
  
  // Look for VML-based image references and convert them
  for (let i = 0; i < inlineImages.length; i++) {
    const img = inlineImages[i];
    console.log(`\n📎 Processing image ${i + 1}/${inlineImages.length}:`);
    console.log(`  Content ID: ${img.contentId}`);
    console.log(`  Content Type: ${img.contentType}`);
    console.log(`  Content Size: ${img.content?.length || 0} bytes`);
    
    if (img.contentId && img.content) {
      // Convert image content to base64 data URL
      const base64 = (img.content as Buffer).toString('base64');
      const dataUrl = `data:${img.contentType || 'image/jpeg'};base64,${base64}`;
      
      console.log(`  Data URL length: ${dataUrl.length}`);
      console.log(`  Data URL preview: ${dataUrl.substring(0, 100)}...`);
      
      // Look for various patterns that might reference this image
      const contentId = img.contentId.replace(/[<>]/g, '');
      console.log(`  Searching for content ID: ${contentId}`);
      
      // Search for any reference to this content ID in the HTML
      const contentIdRefs = processedHtml.match(new RegExp(contentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
      if (contentIdRefs) {
        console.log(`  ✅ Found ${contentIdRefs.length} references to content ID in HTML`);
      } else {
        console.log(`  ❌ No references to content ID found in HTML`);
      }
      
      // Also search for the filename part
      const filename = contentId.split('@')[0];
      const filenameRefs = processedHtml.match(new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
      if (filenameRefs) {
        console.log(`  ✅ Found ${filenameRefs.length} references to filename "${filename}" in HTML`);
      } else {
        console.log(`  ❌ No references to filename "${filename}" found in HTML`);
      }
      
      // Pattern 1: Direct cid: references
      const cidPattern = new RegExp(`cid:${contentId}`, 'gi');
      const cidMatches = processedHtml.match(cidPattern);
      if (cidMatches) {
        console.log(`  ✅ Found ${cidMatches.length} cid: references`);
        processedHtml = processedHtml.replace(cidPattern, dataUrl);
      } else {
        console.log(`  ❌ No cid: references found`);
      }
      
      // Pattern 2: VML imagedata references (convert to img tag)
      const vmlPattern = new RegExp(`<v:imagedata[^>]*src\\s*=\\s*["']?cid:${contentId}["']?[^>]*>`, 'gi');
      const vmlMatches = processedHtml.match(vmlPattern);
      if (vmlMatches) {
        console.log(`  ✅ Found ${vmlMatches.length} VML imagedata references`);
        processedHtml = processedHtml.replace(vmlPattern, `<img src="${dataUrl}" alt="Embedded Image">`);
      } else {
        console.log(`  ❌ No VML imagedata references found`);
      }
      
      // Pattern 3: Microsoft Word image references (convert entire structure to img tag)
      const wordPattern = new RegExp(`<o:picture[^>]*>.*?<v:imagedata[^>]*src\\s*=\\s*["']?cid:${contentId}["']?[^>]*>.*?</o:picture>`, 'gis');
      const wordMatches = processedHtml.match(wordPattern);
      if (wordMatches) {
        console.log(`  ✅ Found ${wordMatches.length} Microsoft Word image references`);
        processedHtml = processedHtml.replace(wordPattern, `<img src="${dataUrl}" alt="Embedded Image">`);
      } else {
        console.log(`  ❌ No Microsoft Word image references found`);
      }
      
      // Pattern 4: Any remaining VML imagedata tags with data URLs (convert to img tags)
      const vmlDataUrlPattern = new RegExp(`<v:imagedata[^>]*src\\s*=\\s*["']?data:image/[^"']*["']?[^>]*>`, 'gi');
      const vmlDataUrlMatches = processedHtml.match(vmlDataUrlPattern);
      if (vmlDataUrlMatches) {
        console.log(`  ✅ Found ${vmlDataUrlMatches.length} VML data URL references`);
        processedHtml = processedHtml.replace(vmlDataUrlPattern, (match) => {
          const srcMatch = match.match(/src\s*=\s*["']?([^"']*)["']?/i);
          if (srcMatch) {
            return `<img src="${srcMatch[1]}" alt="Embedded Image">`;
          }
          return match;
        });
      } else {
        console.log(`  ❌ No VML data URL references found`);
      }
      
      // Pattern 5: Look for any data URL in the HTML and convert to img tag if not already in img tag
      const contentType = img.contentType || 'image/[^"\'\\s]*';
      const dataUrlPattern = new RegExp(`data:${contentType};base64,[A-Za-z0-9+/=]+`, 'gi');
      const dataUrlMatches = processedHtml.match(dataUrlPattern);
      if (dataUrlMatches) {
        console.log(`  ✅ Found ${dataUrlMatches.length} data URL references in HTML`);
        
        // Deduplicate data URLs before processing
        const uniqueDataUrls: string[] = [];
        const seenImageHashes = new Set<string>();
        
        dataUrlMatches.forEach((dataUrl) => {
          try {
            const base64Content = dataUrl.split(',')[1];
            if (base64Content) {
              const contentHash = base64Content.substring(0, 100);
              if (!seenImageHashes.has(contentHash)) {
                seenImageHashes.add(contentHash);
                uniqueDataUrls.push(dataUrl);
              }
            }
          } catch (error) {
            // Skip invalid data URLs
          }
        });
        
        console.log(`  🔄 Processing ${uniqueDataUrls.length} unique data URLs (from ${dataUrlMatches.length} total)`);
        
        // Check if any of these unique data URLs are not already in img tags
        for (const dataUrlMatch of uniqueDataUrls) {
          const escapedDataUrl = dataUrlMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const imgTagPattern = new RegExp(`<img[^>]*src\\s*=\\s*["']?${escapedDataUrl}["']?[^>]*>`, 'gi');
          const existingImgTag = processedHtml.match(imgTagPattern);
          
          if (!existingImgTag) {
            console.log(`  🔄 Converting data URL to img tag: ${dataUrlMatch.substring(0, 50)}...`);
            // Find the context around this data URL to create a proper img tag
            const contextPattern = new RegExp(`([^>]*?)(${escapedDataUrl})([^<]*?)`, 'gi');
            processedHtml = processedHtml.replace(contextPattern, (match, before, dataUrl, after) => {
              // If this looks like it's in a VML context, replace the whole VML structure
              if (before.includes('<v:') || after.includes('</v:')) {
                return `<img src="${dataUrl}" alt="Embedded Image">`;
              }
              // Otherwise, just insert an img tag
              return `${before}<img src="${dataUrl}" alt="Embedded Image">${after}`;
            });
          } else {
            console.log(`  ✅ Data URL already in img tag`);
          }
        }
      } else {
        console.log(`  ❌ No data URL references found in HTML`);
      }
    }
  }
  
  console.log(`\n📊 VML CONVERSION SUMMARY:`);
  console.log(`Final HTML length: ${processedHtml.length}`);
  console.log(`Final HTML preview (first 300 chars):`);
  console.log(processedHtml.substring(0, 300));
  
  // Check final result for img tags
  const finalImgTags = processedHtml.match(/<img[^>]*>/gi);
  if (finalImgTags) {
    console.log(`✅ Final result contains ${finalImgTags.length} img tags:`, finalImgTags.slice(0, 2));
  } else {
    console.log(`❌ Final result contains no img tags`);
  }
  
  return processedHtml;
}

/**
 * Enhanced email parsing with comprehensive Outlook cleanup
 * This function provides more thorough cleaning than the basic parseAndCleanEmail
 */
export async function parseAndCleanEmailEnhanced(rawEmail: string | Buffer): Promise<ParsedEmailResult> {
  console.log(`\n🔍 EMAIL PARSER: Starting email parsing...`);
  console.log(`Raw email type: ${typeof rawEmail}`);
  console.log(`Raw email length: ${rawEmail.length} bytes`);
  
  if (rawEmail.length === 0) {
    console.log(`❌ CRITICAL: Raw email is empty!`);
    return {
      parsed: {} as any,
      text: "",
      html: ""
    };
  }
  
  console.log(`Raw email preview (first 200 chars):`);
  console.log(rawEmail.toString('utf8', 0, 200));
  
  const parsed = await simpleParser(rawEmail);
  
  console.log(`\n📧 PARSER RESULTS:`);
  console.log(`Parsed subject: ${parsed.subject}`);
  console.log(`Parsed from: ${(parsed as any).from?.text}`);
  console.log(`Parsed text length: ${typeof parsed.text === 'string' ? parsed.text.length : 0}`);
  console.log(`Parsed html length: ${typeof parsed.html === 'string' ? parsed.html.length : 0}`);
  console.log(`Attachments count: ${parsed.attachments?.length || 0}`);
  
  // Log attachments details
  if (parsed.attachments && parsed.attachments.length > 0) {
    console.log(`\n📎 PARSER ATTACHMENTS:`);
    for (let i = 0; i < parsed.attachments.length; i++) {
      const att = parsed.attachments[i];
      console.log(`  ${i + 1}. ${att.filename || 'unnamed'}`);
      console.log(`     Type: ${att.contentType}`);
      console.log(`     Disposition: ${att.contentDisposition}`);
      console.log(`     Content ID: ${att.contentId}`);
      console.log(`     Size: ${att.content?.length || 0} bytes`);
      
      if ((att.contentDisposition === 'inline' || att.contentDisposition === undefined) && att.contentId) {
        console.log(`     ✅ INLINE IMAGE DETECTED!`);
      }
    }
  } else {
    console.log(`❌ No attachments found by parser`);
  }

  let text = parsed.text || "";
  let html = parsed.html || "";

  // Comprehensive Outlook/MS Office cleanup
  if (html) {
    console.log(`\n🔧 PROCESSING HTML CONTENT (Backend):`);
    console.log(`HTML length before processing: ${html.length}`);
    
    // Extract data URLs for embedded images and deduplicate them
    const dataUrlMatches = html.match(/data:image\/[^"'\s]+/gi);
    
    if (dataUrlMatches && dataUrlMatches.length > 0) {
      console.log(`Found ${dataUrlMatches.length} data URLs in original HTML`);
      
      // Improved deduplication: Extract base64 content and create hash for proper comparison
      const uniqueDataUrls: string[] = [];
      const seenImageHashes = new Set<string>();
      
      dataUrlMatches.forEach((dataUrl) => {
        try {
          // Extract the base64 content (everything after the comma)
          const base64Content = dataUrl.split(',')[1];
          if (!base64Content) {
            console.log(`  ❌ Invalid data URL format: ${dataUrl.substring(0, 50)}...`);
            return;
          }
          
          // Create a hash of the base64 content for comparison
          // Use first 100 chars of base64 content as a more reliable identifier
          const contentHash = base64Content.substring(0, 100);
          
          if (!seenImageHashes.has(contentHash)) {
            seenImageHashes.add(contentHash);
            uniqueDataUrls.push(dataUrl);
            console.log(`  ✅ Added unique image (hash: ${contentHash.substring(0, 20)}...)`);
          } else {
            console.log(`  ❌ Skipped duplicate image (hash: ${contentHash.substring(0, 20)}...)`);
          }
        } catch (error) {
          console.log(`  ❌ Error processing data URL: ${dataUrl.substring(0, 50)}...`);
        }
      });
      
      console.log(`Deduplicated to ${uniqueDataUrls.length} unique embedded images (from ${dataUrlMatches.length} total)`);
      
      // Replace duplicate data URLs with unique ones in the original HTML
      let processedHtml = html;
      let replacementCount = 0;
      
      // Create a map of duplicate URLs to their unique counterparts
      const urlMap = new Map<string, string>();
      uniqueDataUrls.forEach((uniqueUrl, index) => {
        const base64Content = uniqueUrl.split(',')[1];
        const contentHash = base64Content.substring(0, 100);
        
        // Find all URLs with the same content hash
        dataUrlMatches.forEach(dataUrl => {
          const urlBase64Content = dataUrl.split(',')[1];
          if (urlBase64Content && urlBase64Content.substring(0, 100) === contentHash) {
            urlMap.set(dataUrl, uniqueUrl);
          }
        });
      });
      
      // Replace duplicate URLs with unique ones
      urlMap.forEach((uniqueUrl, duplicateUrl) => {
        if (duplicateUrl !== uniqueUrl) {
          processedHtml = processedHtml.replace(new RegExp(duplicateUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), uniqueUrl);
          replacementCount++;
        }
      });
      
      console.log(`Replaced ${replacementCount} duplicate URLs with unique ones`);
      html = processedHtml;
    } else {
      console.log('No embedded images found, using original content');
    }
    
    console.log(`Final HTML length: ${html.length}`);
    
    // Remove MSO conditional comments
    html = html.replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, '');
    
    // Remove MSO-specific tags (but preserve VML elements that might contain images)
    html = html.replace(/<\/?o:p[^>]*>/gis, "");
    // Don't remove VML elements as they might contain embedded images
    // html = html.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '');
    html = html.replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '');
    
    // Remove MSO-specific style attributes
    html = html.replace(/\s*mso-[^;=]*[;"]/gi, '');
    
    // Remove MSO-specific CSS classes
    html = html.replace(/\s*MsoNormal[^"'\s]*/gi, '');
    html = html.replace(/\s*MsoListParagraph[^"'\s]*/gi, '');
    html = html.replace(/\s*MsoListTable[^"'\s]*/gi, '');
    
    // Clean up empty attributes and extra spaces
    html = html.replace(/style="\s*"/gi, '');
    html = html.replace(/style="\s*;\s*"/gi, '');
    html = html.replace(/style="\s*;\s*;"/gi, '');
    html = html.replace(/class="\s*"/gi, '');
    html = html.replace(/\s+style="/gi, ' style="');
    html = html.replace(/\s+class="/gi, ' class="');
    
    // Clean up extra spaces around attributes
    html = html.replace(/\s+>/gi, '>');
    html = html.replace(/<([^>]+)\s+>/gi, '<$1>');
    
    // Remove MSO-specific XML namespaces (but keep VML namespace for images)
    // html = html.replace(/\s*xmlns:v="urn:schemas-microsoft-com:vml"/gi, '');
    html = html.replace(/\s*xmlns:o="urn:schemas-microsoft-com:office:office"/gi, '');
    html = html.replace(/\s*xmlns:w="urn:schemas-microsoft-com:office:word"/gi, '');
    
    // Remove MSO-specific style blocks
    html = html.replace(/<style[^>]*>\s*\/\*\[if[^>]*>[\s\S]*?<!\[endif\]\*\/\s*<\/style>/gi, '');
    
    // Clean up empty paragraphs and divs (but be careful not to remove image containers)
    html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');
    html = html.replace(/<div[^>]*>\s*<\/div>/gi, '');
    html = html.replace(/<span[^>]*>\s*<\/span>/gi, "");
    
    // Clean up multiple consecutive line breaks
    html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Special handling for Microsoft Word embedded images
    // Convert VML-based embedded images to regular img tags with data URLs
    console.log(`\n🖼️ VML IMAGE CONVERSION:`);
    console.log(`HTML before VML conversion length: ${html.length}`);
    console.log(`HTML before VML conversion preview (first 300 chars):`);
    console.log(html.substring(0, 300));
    
    // Check for VML elements before conversion
    const vmlElements = html.match(/<v:[^>]*>/gi);
    if (vmlElements) {
      console.log(`Found ${vmlElements.length} VML elements before conversion:`, vmlElements.slice(0, 3));
    } else {
      console.log(`No VML elements found before conversion`);
    }
    
    html = convertVmlImagesToImgTags(html, parsed);
    
    console.log(`HTML after VML conversion length: ${html.length}`);
    console.log(`HTML after VML conversion preview (first 300 chars):`);
    console.log(html.substring(0, 300));
    
    // Check for img tags after conversion
    const imgTags = html.match(/<img[^>]*>/gi);
    if (imgTags) {
      console.log(`Found ${imgTags.length} img tags after conversion:`, imgTags.slice(0, 2));
    } else {
      console.log(`No img tags found after conversion`);
    }
  }

  return {
    text: text.trim(),
    html: html.trim(),
    parsed
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use parseAndCleanEmailEnhanced instead
 */
export function sanitizeMsoTags(htmlContent: string): string {
  if (!htmlContent) return htmlContent;

  let sanitized = htmlContent;

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
}
