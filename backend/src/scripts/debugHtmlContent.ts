import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugHtmlContent() {
  console.log('🔍 Debugging HTML content for Test 39 email...');
  
  try {
    // Get the Test 39 email
    const emailLog = await prisma.emailLog.findFirst({
      where: {
        subject: {
          contains: 'Test 39'
        }
      },
      select: {
        id: true,
        subject: true,
        htmlBody: true
      }
    });
    
    if (!emailLog || !emailLog.htmlBody) {
      console.log('❌ No Test 39 email or HTML content found');
      return;
    }
    
    console.log(`📧 Found email: ${emailLog.subject}`);
    console.log(`📧 HTML length: ${emailLog.htmlBody.length}`);
    
    // Write HTML to file for inspection
    const fs = require('fs');
    const path = require('path');
    
    const outputPath = path.join(__dirname, '..', '..', 'debug-test39.html');
    fs.writeFileSync(outputPath, emailLog.htmlBody);
    console.log(`📄 HTML content written to: ${outputPath}`);
    
    // Count all occurrences of img tags and data URLs
    const allImgTags = emailLog.htmlBody.match(/<img[^>]*>/gi) || [];
    const allDataUrls = emailLog.htmlBody.match(/data:image\/[^"'\s]+/gi) || [];
    
    console.log(`🖼️ Total img tags: ${allImgTags.length}`);
    console.log(`🖼️ Total data URLs: ${allDataUrls.length}`);
    
    // Check for duplicate data URLs
    const uniqueDataUrls = new Set<string>();
    const duplicateDataUrls = new Set<string>();
    
    allDataUrls.forEach(url => {
      if (uniqueDataUrls.has(url)) {
        duplicateDataUrls.add(url);
      } else {
        uniqueDataUrls.add(url);
      }
    });
    
    console.log(`🖼️ Unique data URLs: ${uniqueDataUrls.size}`);
    console.log(`🖼️ Duplicate data URLs: ${duplicateDataUrls.size}`);
    
    if (duplicateDataUrls.size > 0) {
      console.log('🔄 Duplicate data URLs found:');
      duplicateDataUrls.forEach((url, index) => {
        const preview = url.substring(0, 100) + '...';
        console.log(`  ${index + 1}. ${preview}`);
      });
    }
    
    // Check for nested img tags or other patterns
    const nestedPatterns = emailLog.htmlBody.match(/<img[^>]*<img[^>]*>/gi) || [];
    console.log(`🖼️ Nested img patterns: ${nestedPatterns.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugHtmlContent();
