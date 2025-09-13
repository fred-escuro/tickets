import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugEmail() {
  console.log('🔍 Debugging Test 39 email...');
  
  try {
    // Find the Test 39 email
    const emailLog = await prisma.emailLog.findFirst({
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
        body: true,
        imap_raw: true
      }
    });
    
    if (!emailLog) {
      console.log('❌ No Test 39 email found');
      return;
    }
    
    console.log(`📧 Found email: ${emailLog.subject}`);
    console.log(`📧 From: ${emailLog.from}`);
    console.log(`📧 HTML length: ${emailLog.htmlBody?.length || 0}`);
    console.log(`📧 Body length: ${emailLog.body?.length || 0}`);
    console.log(`📧 IMAP raw length: ${emailLog.imap_raw?.length || 0}`);
    
    // Count images in HTML
    if (emailLog.htmlBody) {
      const imgTags = emailLog.htmlBody.match(/<img[^>]*>/gi) || [];
      const dataUrls = emailLog.htmlBody.match(/data:image\/[^"'\s]+/gi) || [];
      
      console.log(`🖼️ Image tags found: ${imgTags.length}`);
      console.log(`🖼️ Data URLs found: ${dataUrls.length}`);
      
      // Show unique data URLs
      const uniqueDataUrls = new Set<string>();
      dataUrls.forEach(url => {
        // Extract just the base64 part for comparison
        const base64Part = url.split(',')[1]?.substring(0, 50) || '';
        uniqueDataUrls.add(base64Part);
      });
      
      console.log(`🖼️ Unique data URLs: ${uniqueDataUrls.size}`);
      
      // Show first few characters of each data URL
      dataUrls.forEach((url, index) => {
        const preview = url.substring(0, 100) + '...';
        console.log(`  ${index + 1}. ${preview}`);
      });
    }
    
    // Check if there are any attachments (attachments are linked to tickets, not email logs directly)
    const ticket = await prisma.ticket.findFirst({
      where: {
        emailLogs: {
          some: {
            id: emailLog.id
          }
        }
      },
      include: {
        attachments: true
      }
    });
    
    console.log(`📎 Attachments in database: ${ticket?.attachments.length || 0}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugEmail();
