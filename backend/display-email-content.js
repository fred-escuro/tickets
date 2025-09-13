const { PrismaClient } = require('@prisma/client');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');

async function displayEmailContent() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Displaying email content in readable format...\n');
    
    // Query Test 37 email
    const email = await prisma.emailLog.findFirst({
      where: {
        subject: 'Test 37'
      },
      select: {
        id: true,
        messageId: true,
        subject: true,
        from: true,
        to: true,
        imap_raw: true,
        processedAt: true
      }
    });
    
    if (!email) {
      console.log('❌ Test 37 not found');
      return;
    }
    
    console.log('📧 Email Details:');
    console.log(`   ID: ${email.id}`);
    console.log(`   Message ID: ${email.messageId}`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`   From: ${email.from}`);
    console.log(`   To: ${email.to}`);
    console.log(`   Processed: ${email.processedAt}`);
    console.log(`   Raw Length: ${email.imap_raw?.length || 'NULL'} base64 chars`);
    
    if (!email.imap_raw) {
      console.log('❌ No raw data available');
      return;
    }
    
    // Decode base64 to get raw email content
    const rawEmailBuffer = Buffer.from(email.imap_raw, 'base64');
    
    // Parse the email using mailparser
    const parsed = await simpleParser(rawEmailBuffer);
    
    console.log('\n' + '='.repeat(80));
    console.log('📧 PARSED EMAIL CONTENT');
    console.log('='.repeat(80));
    
    // Display headers
    console.log('\n📋 EMAIL HEADERS:');
    console.log('-'.repeat(40));
    console.log(`From: ${parsed.from?.text || 'N/A'}`);
    console.log(`To: ${parsed.to?.text || 'N/A'}`);
    console.log(`Subject: ${parsed.subject || 'N/A'}`);
    console.log(`Date: ${parsed.date || 'N/A'}`);
    console.log(`Message ID: ${parsed.messageId || 'N/A'}`);
    console.log(`In-Reply-To: ${parsed.inReplyTo || 'N/A'}`);
    console.log(`References: ${parsed.references || 'N/A'}`);
    
    // Display text content
    if (parsed.text) {
      console.log('\n📝 TEXT CONTENT:');
      console.log('-'.repeat(40));
      console.log(parsed.text);
    }
    
    // Display HTML content
    if (parsed.html) {
      console.log('\n🌐 HTML CONTENT:');
      console.log('-'.repeat(40));
      console.log(parsed.html);
    }
    
    // Display attachments
    if (parsed.attachments && parsed.attachments.length > 0) {
      console.log('\n📎 ATTACHMENTS:');
      console.log('-'.repeat(40));
      parsed.attachments.forEach((attachment, index) => {
        console.log(`${index + 1}. ${attachment.filename || 'unnamed'}`);
        console.log(`   Type: ${attachment.contentType}`);
        console.log(`   Size: ${attachment.size} bytes`);
        console.log(`   Content ID: ${attachment.cid || 'N/A'}`);
        
        // Save attachment to file
        if (attachment.content) {
          const filename = attachment.filename || `attachment_${index + 1}`;
          const filepath = path.join(__dirname, 'attachments', filename);
          
          // Create attachments directory if it doesn't exist
          const attachmentsDir = path.join(__dirname, 'attachments');
          if (!fs.existsSync(attachmentsDir)) {
            fs.mkdirSync(attachmentsDir, { recursive: true });
          }
          
          fs.writeFileSync(filepath, attachment.content);
          console.log(`   Saved to: ${filepath}`);
        }
      });
    }
    
    // Display embedded images
    if (parsed.attachments) {
      const images = parsed.attachments.filter(att => 
        att.contentType && att.contentType.startsWith('image/')
      );
      
      if (images.length > 0) {
        console.log('\n🖼️  EMBEDDED IMAGES:');
        console.log('-'.repeat(40));
        images.forEach((image, index) => {
          console.log(`${index + 1}. ${image.filename || 'image_' + (index + 1)}`);
          console.log(`   Type: ${image.contentType}`);
          console.log(`   Size: ${image.size} bytes`);
          console.log(`   Content ID: ${image.cid || 'N/A'}`);
          
          // Save image to file
          if (image.content) {
            const filename = image.filename || `image_${index + 1}.png`;
            const filepath = path.join(__dirname, 'attachments', filename);
            fs.writeFileSync(filepath, image.content);
            console.log(`   Saved to: ${filepath}`);
          }
        });
      }
    }
    
    // Display email structure
    console.log('\n🏗️  EMAIL STRUCTURE:');
    console.log('-'.repeat(40));
    console.log(`Has Text: ${parsed.text ? 'Yes' : 'No'}`);
    console.log(`Has HTML: ${parsed.html ? 'Yes' : 'No'}`);
    console.log(`Attachments: ${parsed.attachments ? parsed.attachments.length : 0}`);
    console.log(`Embedded Images: ${parsed.attachments ? parsed.attachments.filter(att => att.contentType && att.contentType.startsWith('image/')).length : 0}`);
    
    // Create HTML preview file
    if (parsed.html) {
      const htmlPreview = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Preview: ${email.subject}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .content { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
        .attachment { background: #e9e9e9; padding: 10px; margin: 10px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>📧 ${email.subject}</h2>
        <p><strong>From:</strong> ${email.from}</p>
        <p><strong>To:</strong> ${email.to}</p>
        <p><strong>Date:</strong> ${email.processedAt}</p>
    </div>
    <div class="content">
        ${parsed.html}
    </div>
    ${parsed.attachments && parsed.attachments.length > 0 ? `
    <div class="attachment">
        <h3>📎 Attachments (${parsed.attachments.length})</h3>
        ${parsed.attachments.map(att => `<p>• ${att.filename || 'unnamed'} (${att.contentType})</p>`).join('')}
    </div>
    ` : ''}
</body>
</html>`;
      
      const htmlFilepath = path.join(__dirname, 'email_preview.html');
      fs.writeFileSync(htmlFilepath, htmlPreview);
      console.log(`\n🌐 HTML Preview saved to: ${htmlFilepath}`);
    }
    
    console.log('\n✅ Email content displayed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

displayEmailContent();
