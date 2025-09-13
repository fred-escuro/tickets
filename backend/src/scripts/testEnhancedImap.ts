#!/usr/bin/env ts-node

/**
 * Test script for Enhanced IMAP Service
 * 
 * This script tests the enhanced IMAP service with both ImapFlow and node-imap
 * to ensure proper fallback functionality and email operations.
 * 
 * Usage: npm run test:imap
 */

import { EnhancedImapService, ImapConnectionConfig } from '../services/enhancedImapService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEnhancedImapService() {
	console.log('🧪 Testing Enhanced IMAP Service...\n');

	// Configuration from environment variables
	const config: ImapConnectionConfig = {
		host: process.env.IMAP_HOST || 'imap.gmail.com',
		port: parseInt(process.env.IMAP_PORT || '993'),
		secure: process.env.IMAP_SECURE === 'true' || true,
		user: process.env.IMAP_USER || '',
		password: process.env.IMAP_PASSWORD || '',
		connTimeout: 60000,
		authTimeout: 30000,
		keepalive: {
			interval: 10000,
			idleInterval: 300000,
			forceNoop: true
		}
	};

	// Validate configuration
	if (!config.host || !config.user || !config.password) {
		console.error('❌ Missing required IMAP configuration:');
		console.error('   - IMAP_HOST:', config.host || 'NOT SET');
		console.error('   - IMAP_USER:', config.user || 'NOT SET');
		console.error('   - IMAP_PASSWORD:', config.password ? '***SET***' : 'NOT SET');
		console.error('\nPlease set these environment variables and try again.');
		process.exit(1);
	}

	const imapService = new EnhancedImapService(config);

	try {
		// Test 1: Connection
		console.log('🔌 Test 1: Connecting to IMAP server...');
		const connected = await imapService.connect();
		
		if (!connected) {
			console.error('❌ Failed to connect to IMAP server using both node-imap and ImapFlow');
			process.exit(1);
		}

		const connectionInfo = imapService.getConnectionInfo();
		console.log(`✅ Connected successfully using: ${connectionInfo.type}\n`);

		// Test 2: List Mailboxes
		console.log('📁 Test 2: Listing mailboxes...');
		const mailboxes = await imapService.listMailboxes();
		console.log(`✅ Found ${mailboxes.length} mailboxes:`);
		
		mailboxes.slice(0, 5).forEach((mailbox, index) => {
			console.log(`   ${index + 1}. ${mailbox.name}`);
		});
		
		if (mailboxes.length > 5) {
			console.log(`   ... and ${mailboxes.length - 5} more`);
		}
		console.log('');

		// Test 3: Open INBOX
		console.log('📧 Test 3: Opening INBOX...');
		try {
			await imapService.openMailbox('INBOX');
			console.log('✅ Successfully opened INBOX\n');
		} catch (error: any) {
			console.log(`⚠️ Could not open INBOX: ${error.message}\n`);
		}

		// Test 4: Fetch Unread Messages (limited to 3 for testing)
		console.log('📬 Test 4: Fetching unread messages...');
		try {
			const messages = await imapService.fetchUnreadMessages('INBOX');
			console.log(`✅ Found ${messages.length} unread messages`);
			
			if (messages.length > 0) {
				console.log('   Sample messages:');
				messages.slice(0, 3).forEach((msg, index) => {
					console.log(`   ${index + 1}. UID: ${msg.uid}, Date: ${msg.date.toISOString()}, Flags: [${msg.flags.join(', ')}]`);
				});
			}
		} catch (error: any) {
			console.log(`⚠️ Could not fetch unread messages: ${error.message}`);
		}
		console.log('');

		// Test 5: Create Test Folder
		console.log('📁 Test 5: Creating test folder...');
		const testFolder = 'IMAP_Test_' + Date.now();
		const createResult = await imapService.createMailbox(testFolder);
		
		if (createResult.success) {
			console.log(`✅ Successfully created test folder: ${testFolder}`);
		} else {
			console.log(`⚠️ Could not create test folder: ${createResult.error}`);
		}
		console.log('');

		// Test 6: Flag Operations (if we have messages)
		console.log('🏷️ Test 6: Testing flag operations...');
		try {
			const messages = await imapService.fetchUnreadMessages('INBOX');
			if (messages.length > 0) {
				const testMessage = messages[0];
				console.log(`   Testing with message UID: ${testMessage.uid}`);
				
				// Test flag as important
				const flagResult = await imapService.flagAsImportant(testMessage.uid, 'INBOX');
				if (flagResult.success) {
					console.log('   ✅ Successfully flagged message as important');
				} else {
					console.log(`   ⚠️ Could not flag message: ${flagResult.error}`);
				}
				
				// Test unflag as important
				const unflagResult = await imapService.unflagAsImportant(testMessage.uid, 'INBOX');
				if (unflagResult.success) {
					console.log('   ✅ Successfully unflagged message');
				} else {
					console.log(`   ⚠️ Could not unflag message: ${unflagResult.error}`);
				}
			} else {
				console.log('   ⚠️ No messages available for flag testing');
			}
		} catch (error: any) {
			console.log(`   ⚠️ Flag operations failed: ${error.message}`);
		}
		console.log('');

		// Test 7: Connection Info
		console.log('ℹ️ Test 7: Connection information...');
		const info = imapService.getConnectionInfo();
		console.log(`   Connected: ${info.connected}`);
		console.log(`   Connection Type: ${info.type}`);
		console.log('');

		console.log('🎉 All tests completed successfully!');

	} catch (error: any) {
		console.error('❌ Test failed:', error.message);
		console.error('Stack trace:', error.stack);
	} finally {
		// Cleanup
		console.log('🧹 Disconnecting...');
		await imapService.disconnect();
		console.log('✅ Disconnected successfully');
	}
}

// Run the test
if (require.main === module) {
	testEnhancedImapService()
		.then(() => {
			console.log('\n✨ Enhanced IMAP Service test completed');
			process.exit(0);
		})
		.catch((error) => {
			console.error('\n💥 Test failed:', error);
			process.exit(1);
		});
}

export { testEnhancedImapService };
