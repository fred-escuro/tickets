import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugContentDuplication() {
  console.log('🔍 Debugging content duplication in Test 39 email...');
  
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
    
    // Check for repeated content patterns
    const html = emailLog.htmlBody;
    
    // Look for repeated text patterns that might indicate duplication
    const testPatterns = [
      'uniqueDataUrls',
      'seenHeaders', 
      'emailParserService.ts',
      'truncated-email-display.tsx',
      'API request failed',
      'netstat -an | findstr :3001'
    ];
    
    console.log('\n🔍 Checking for repeated content patterns:');
    testPatterns.forEach(pattern => {
      const matches = html.match(new RegExp(pattern, 'gi')) || [];
      console.log(`  "${pattern}": ${matches.length} occurrences`);
    });
    
    // Check for repeated image blocks
    const imgBlocks = html.match(/<img[^>]*>/gi) || [];
    console.log(`\n🖼️ Total img tags: ${imgBlocks.length}`);
    
    // Group images by their src to see duplicates
    const imageSrcs = new Map<string, number>();
    imgBlocks.forEach(img => {
      const srcMatch = img.match(/src="([^"]+)"/);
      if (srcMatch) {
        const src = srcMatch[1];
        imageSrcs.set(src, (imageSrcs.get(src) || 0) + 1);
      }
    });
    
    console.log('\n🖼️ Image src occurrences:');
    imageSrcs.forEach((count, src) => {
      const preview = src.substring(0, 50) + '...';
      console.log(`  ${count}x: ${preview}`);
    });
    
    // Check for repeated paragraph blocks
    const paragraphs = html.match(/<p[^>]*>.*?<\/p>/gi) || [];
    console.log(`\n📝 Total paragraph blocks: ${paragraphs.length}`);
    
    // Look for repeated paragraph content
    const paragraphContent = new Map<string, number>();
    paragraphs.forEach(p => {
      const cleanContent = p.replace(/<[^>]*>/g, '').trim();
      if (cleanContent.length > 20) { // Only count substantial content
        paragraphContent.set(cleanContent, (paragraphContent.get(cleanContent) || 0) + 1);
      }
    });
    
    console.log('\n📝 Repeated paragraph content:');
    paragraphContent.forEach((count, content) => {
      if (count > 1) {
        const preview = content.substring(0, 100) + '...';
        console.log(`  ${count}x: ${preview}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugContentDuplication();
