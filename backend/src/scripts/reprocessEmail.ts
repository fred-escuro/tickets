import { PrismaClient } from '@prisma/client';
import { parseAndCleanEmailEnhanced } from '../services/emailParserService';

const prisma = new PrismaClient();

async function reprocessEmail(emailId: string) {
  console.log(`🔄 Reprocessing email with ID: ${emailId}`);
  
  try {
    // Get the email log record
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailId }
    });
    
    if (!emailLog) {
      console.log(`❌ Email log not found with ID: ${emailId}`);
      return;
    }
    
    console.log(`📧 Found email: ${emailLog.subject}`);
    console.log(`📧 From: ${emailLog.from}`);
    console.log(`📧 Current HTML length: ${emailLog.htmlBody?.length || 0}`);
    
    // Check if we have raw IMAP data to reprocess
    if (!emailLog.imap_raw) {
      console.log(`❌ No raw IMAP data available for reprocessing`);
      return;
    }
    
    // Decode the raw IMAP data
    const rawEmailBuffer = Buffer.from(emailLog.imap_raw, 'base64');
    console.log(`📧 Raw IMAP data length: ${rawEmailBuffer.length} bytes`);
    
    // Reprocess with the new enhanced parser
    console.log(`🔧 Reprocessing with enhanced parser...`);
    const { parsed, text: cleanText, html: cleanHtml } = await parseAndCleanEmailEnhanced(rawEmailBuffer);
    
    console.log(`📊 Reprocessing results:`);
    console.log(`  Clean text length: ${cleanText?.length || 0}`);
    console.log(`  Clean HTML length: ${cleanHtml?.length || 0}`);
    console.log(`  Attachments count: ${parsed.attachments?.length || 0}`);
    
    // Count images in the new HTML
    const imgTags = cleanHtml?.match(/<img[^>]*>/gi) || [];
    console.log(`  Image tags found: ${imgTags.length}`);
    
    // Count data URLs
    const dataUrls = cleanHtml?.match(/data:image\/[^"'\s]+/gi) || [];
    console.log(`  Data URLs found: ${dataUrls.length}`);
    
    // Update the email log with the reprocessed content
    await prisma.emailLog.update({
      where: { id: emailId },
      data: {
        body: cleanText,
        htmlBody: cleanHtml,
        processedAt: new Date()
      }
    });
    
    console.log(`✅ Email reprocessed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`  Original HTML length: ${emailLog.htmlBody?.length || 0}`);
    console.log(`  New HTML length: ${cleanHtml?.length || 0}`);
    console.log(`  Images in original: ${(emailLog.htmlBody?.match(/<img[^>]*>/gi) || []).length}`);
    console.log(`  Images in new: ${imgTags.length}`);
    
  } catch (error) {
    console.error(`❌ Error reprocessing email:`, error);
  }
}

async function reprocessTest39Emails() {
  console.log(`🔍 Looking for Test 39 emails...`);
  
  try {
    // Find all emails with "Test 39" in the subject
    const test39Emails = await prisma.emailLog.findMany({
      where: {
        subject: {
          contains: 'Test 39'
        }
      },
      select: {
        id: true,
        subject: true,
        from: true,
        htmlBody: true,
        imap_raw: true
      }
    });
    
    console.log(`📧 Found ${test39Emails.length} Test 39 emails`);
    
    for (const email of test39Emails) {
      console.log(`\n📧 Processing: ${email.subject}`);
      console.log(`📧 From: ${email.from}`);
      console.log(`📧 Current images: ${(email.htmlBody?.match(/<img[^>]*>/gi) || []).length}`);
      
      await reprocessEmail(email.id);
    }
    
  } catch (error) {
    console.error(`❌ Error finding Test 39 emails:`, error);
  }
}

// Run the reprocessing
async function main() {
  try {
    await reprocessTest39Emails();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { reprocessEmail, reprocessTest39Emails };
