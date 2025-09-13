import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugApiResponse() {
  console.log('🔍 Debugging API response for Test 39 email...');
  
  try {
    // Simulate the same query that the API endpoint uses
    const ticket = await prisma.ticket.findFirst({
      where: {
        emailLogs: {
          some: {
            subject: {
              contains: 'Test 39'
            }
          }
        }
      },
      include: {
        emailLogs: {
          select: {
            id: true,
            from: true,
            to: true,
            cc: true,
            subject: true,
            body: true,
            htmlBody: true,
            receivedAt: true,
            messageId: true,
            imap_raw: true,
            rawMeta: true,
            processedAt: true
          },
          where: { direction: 'INBOUND' },
          orderBy: { receivedAt: 'asc' }
        }
      }
    });
    
    if (!ticket) {
      console.log('❌ No ticket found for Test 39');
      return;
    }
    
    console.log(`📧 Found ticket with ${ticket.emailLogs.length} email logs`);
    
    const test39Email = ticket.emailLogs.find(email => email.subject?.includes('Test 39'));
    
    if (!test39Email) {
      console.log('❌ Test 39 email not found in ticket');
      return;
    }
    
    console.log(`📧 Test 39 email found:`);
    console.log(`📧 Subject: ${test39Email.subject}`);
    console.log(`📧 HTML length: ${test39Email.htmlBody?.length || 0}`);
    
    // Count images in the HTML that would be sent to frontend
    if (test39Email.htmlBody) {
      const imgTags = test39Email.htmlBody.match(/<img[^>]*>/gi) || [];
      const dataUrls = test39Email.htmlBody.match(/data:image\/[^"'\s]+/gi) || [];
      
      console.log(`🖼️ Image tags in API response: ${imgTags.length}`);
      console.log(`🖼️ Data URLs in API response: ${dataUrls.length}`);
      
      // Show the actual img tags
      imgTags.forEach((tag, index) => {
        console.log(`  ${index + 1}. ${tag.substring(0, 100)}...`);
      });
      
      // Show data URLs
      dataUrls.forEach((url, index) => {
        const preview = url.substring(0, 100) + '...';
        console.log(`  ${index + 1}. ${preview}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugApiResponse();
