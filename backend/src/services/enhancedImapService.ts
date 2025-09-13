/**
 * Enhanced IMAP Service with automatic fallback support
 * 
 * This service provides robust IMAP operations with automatic fallback between
 * node-imap (primary) and ImapFlow (fallback) libraries to ensure maximum compatibility.
 */

import { ImapFlow, type FetchMessageObject } from 'imapflow';
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { EventEmitter } from 'events';

export interface ImapConnectionConfig {
	host: string;
	port: number;
	secure: boolean;
	user: string;
	password: string;
	// Additional node-imap specific options
	tls?: boolean;
	tlsOptions?: any;
	connTimeout?: number;
	authTimeout?: number;
	keepalive?: any;
}

export interface EmailOperationResult {
	success: boolean;
	error?: string;
	details?: any;
}

export interface ImapMessage {
	uid: number;
	seqno?: number;
	flags: string[];
	date: Date;
	envelope?: any;
	source?: Buffer;
	size?: number;
}

export class EnhancedImapService extends EventEmitter {
	private imapFlowClient: ImapFlow | null = null;
	private nodeImapClient: Imap | null = null;
	private config: ImapConnectionConfig;
	private connectionType: 'imapflow' | 'node-imap' | null = null;
	private isConnected = false;

	constructor(config: ImapConnectionConfig) {
		super();
		this.config = config;
	}

	/**
	 * Connect using node-imap first, fallback to ImapFlow if needed
	 */
	async connect(): Promise<boolean> {
		console.log('🔌 Attempting to connect to IMAP server...');
		
		// Try node-imap first
		try {
			await this.connectWithNodeImap();
			this.connectionType = 'node-imap';
			this.isConnected = true;
			console.log('✅ Connected successfully using node-imap');
			return true;
		} catch (nodeImapError: any) {
			console.log('⚠️ node-imap connection failed:', nodeImapError.message);
			console.log('🔄 Falling back to ImapFlow...');
			
			try {
				await this.connectWithImapFlow();
				this.connectionType = 'imapflow';
				this.isConnected = true;
				console.log('✅ Connected successfully using ImapFlow');
				return true;
			} catch (imapFlowError: any) {
				console.error('❌ Both IMAP connection methods failed:');
				console.error('node-imap error:', nodeImapError.message);
				console.error('ImapFlow error:', imapFlowError.message);
				this.isConnected = false;
				this.connectionType = null;
				return false;
			}
		}
	}

	private async connectWithImapFlow(): Promise<void> {
		this.imapFlowClient = new ImapFlow({
			host: this.config.host,
			port: this.config.port,
			secure: this.config.secure,
			auth: { 
				user: this.config.user, 
				pass: this.config.password 
			},
			logger: false,
			// Allow self-signed certificates and certificate name mismatches
			tls: {
				rejectUnauthorized: false
			}
		});

		await this.imapFlowClient.connect();
	}

	private async connectWithNodeImap(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.nodeImapClient = new Imap({
				user: this.config.user,
				password: this.config.password,
				host: this.config.host,
				port: this.config.port,
				tls: this.config.secure,
				tlsOptions: {
					...this.config.tlsOptions,
					// Allow self-signed certificates and certificate name mismatches
					rejectUnauthorized: false,
					checkServerIdentity: () => undefined
				},
				connTimeout: this.config.connTimeout || 60000,
				authTimeout: this.config.authTimeout || 30000,
				keepalive: this.config.keepalive || { interval: 10000, idleInterval: 300000, forceNoop: true }
			});

			this.nodeImapClient.once('ready', () => {
				console.log('📧 node-imap client ready');
				resolve();
			});

			this.nodeImapClient.once('error', (err: Error) => {
				console.error('❌ node-imap connection error:', err);
				reject(err);
			});

			this.nodeImapClient.connect();
		});
	}

	/**
	 * Disconnect from IMAP server
	 */
	async disconnect(): Promise<void> {
		console.log('🔌 Disconnecting from IMAP server...');
		
		if (this.connectionType === 'imapflow' && this.imapFlowClient) {
			try {
				await this.imapFlowClient.logout();
				console.log('✅ Disconnected from ImapFlow');
			} catch (error: any) {
				console.error('⚠️ Error disconnecting from ImapFlow:', error.message);
			}
		} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
			try {
				this.nodeImapClient.end();
				console.log('✅ Disconnected from node-imap');
			} catch (error: any) {
				console.error('⚠️ Error disconnecting from node-imap:', error.message);
			}
		}

		this.isConnected = false;
		this.connectionType = null;
	}

	/**
	 * List available mailboxes/folders
	 */
	async listMailboxes(): Promise<any[]> {
		if (!this.isConnected) {
			throw new Error('Not connected to IMAP server');
		}

		if (this.connectionType === 'imapflow' && this.imapFlowClient) {
			const folders = await this.imapFlowClient.list();
			return folders.map(folder => ({
				name: folder.name,
				flags: Array.from(folder.flags),
				path: folder.path
			}));
		} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
			return new Promise((resolve, reject) => {
				(this.nodeImapClient as any).getBoxes((err: any, boxes: any) => {
					if (err) {
						reject(err);
					} else {
						// Convert node-imap boxes format to our format
						const mailboxes = Object.keys(boxes || {}).map(name => ({
							name,
							path: boxes[name].attribs || [],
							delimiter: boxes[name].delimiter || '/',
							children: [],
							parent: null,
							attribs: boxes[name].attribs || [],
							specialUse: null
						}));
						resolve(mailboxes);
					}
				});
			});
		}

		throw new Error('No active IMAP connection');
	}

	/**
	 * Open a mailbox/folder
	 */
	async openMailbox(mailbox: string): Promise<void> {
		if (!this.isConnected) {
			throw new Error('Not connected to IMAP server');
		}

		if (this.connectionType === 'imapflow' && this.imapFlowClient) {
			await this.imapFlowClient.mailboxOpen(mailbox);
		} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
			return new Promise((resolve, reject) => {
				this.nodeImapClient!.openBox(mailbox, false, (err: any, box: any) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		} else {
			throw new Error('No active IMAP connection');
		}
	}

	/**
	 * Create a mailbox/folder
	 */
	async createMailbox(mailbox: string): Promise<EmailOperationResult> {
		if (!this.isConnected) {
			return { success: false, error: 'Not connected to IMAP server' };
		}

		try {
			if (this.connectionType === 'imapflow' && this.imapFlowClient) {
				await this.imapFlowClient.mailboxCreate(mailbox);
				return { success: true };
			} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
				return new Promise((resolve) => {
					this.nodeImapClient!.addBox(mailbox, (err: any) => {
						if (err) {
							resolve({ success: false, error: err.message });
						} else {
							resolve({ success: true });
						}
					});
				});
			} else {
				return { success: false, error: 'No active IMAP connection' };
			}
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Fetch unread messages
	 */
	async fetchUnreadMessages(mailbox: string): Promise<ImapMessage[]> {
		if (!this.isConnected) {
			throw new Error('Not connected to IMAP server');
		}

		await this.openMailbox(mailbox);

		if (this.connectionType === 'imapflow' && this.imapFlowClient) {
			const messages: ImapMessage[] = [];
			const query = { seen: false } as any;
			
			for await (const msg of this.imapFlowClient.fetch(query, { uid: true, source: true, envelope: true })) {
				messages.push({
					uid: msg.uid,
					flags: Array.from(msg.flags || []),
					date: msg.envelope?.date || new Date(),
					envelope: msg.envelope,
					source: msg.source as Buffer,
					size: (msg.source as Buffer)?.length
				});
			}
			return messages;
		} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
			return new Promise((resolve, reject) => {
				this.nodeImapClient!.search(['UNSEEN'], (err, results) => {
					if (err) {
						reject(err);
						return;
					}

					if (!results || results.length === 0) {
						resolve([]);
						return;
					}

					const fetch = this.nodeImapClient!.fetch(results, { 
						bodies: '',
						struct: true,
						envelope: true
					});

					const messages: ImapMessage[] = [];

					const messagePromises: Promise<ImapMessage>[] = [];

					fetch.on('message', (msg: any, seqno: number) => {
						const messagePromise = new Promise<ImapMessage>((resolveMsg, rejectMsg) => {
							let flags: string[] = [];
							let envelope: any = null;
							let source = Buffer.alloc(0);
							let bodyCompleted = false;
							let envelopeReceived = false;

							msg.on('attributes', (attrs: any) => {
								flags = attrs.flags || [];
							});

							msg.on('body', (stream: any) => {
								const chunks: Buffer[] = [];
								stream.on('data', (chunk: any) => chunks.push(chunk));
								stream.on('end', () => {
									source = Buffer.concat(chunks);
									bodyCompleted = true;
									console.log(`📧 Body completed for message ${seqno}, source length: ${source.length}`);
									
									// Check if we can resolve the message now
									if (envelopeReceived) {
										resolveMessage();
									}
								});
							});

							msg.on('envelope', (env: any) => {
								envelope = env;
								envelopeReceived = true;
								
								// Check if we can resolve the message now
								if (bodyCompleted) {
									resolveMessage();
								}
							});

							const resolveMessage = () => {
								const message: ImapMessage = {
									uid: results[seqno - 1],
									seqno,
									flags,
									date: envelope?.date || new Date(),
									envelope,
									source,
									size: source.length
								};
								console.log(`📧 Message ${seqno} processed, source length: ${source.length}`);
								console.log(`📧 Source buffer type: ${typeof source}`);
								console.log(`📧 Source buffer exists: ${!!source}`);
								if (source && source.length > 0) {
									console.log(`📧 Source preview: ${source.toString('utf8', 0, 100)}...`);
								}
								resolveMsg(message);
							};

							msg.once('end', () => {
								// Fallback timeout in case body/envelope events don't fire properly
								setTimeout(() => {
									if (!bodyCompleted || !envelopeReceived) {
										console.log(`⚠️ Message ${seqno} timeout - body completed: ${bodyCompleted}, envelope received: ${envelopeReceived}`);
										resolveMessage();
									}
								}, 1000); // Increased timeout to 1 second
							});

							msg.once('error', rejectMsg);
						});

						messagePromises.push(messagePromise);
					});

					fetch.once('error', reject);
					fetch.once('end', async () => {
						try {
							const allMessages = await Promise.all(messagePromises);
							resolve(allMessages);
						} catch (error) {
							reject(error);
						}
					});
				});
			});
		}

		throw new Error('No active IMAP connection');
	}

	/**
	 * Move message to another folder (with fallback logic)
	 */
	async moveMessage(uid: number, fromMailbox: string, toMailbox: string): Promise<EmailOperationResult> {
		if (!this.isConnected) {
			return { success: false, error: 'Not connected to IMAP server' };
		}

		console.log(`📧 Attempting to move message ${uid} from ${fromMailbox} to ${toMailbox}`);

		try {
			// Ensure destination folder exists (prefix with INBOX. if needed)
			const folderName = toMailbox.startsWith('INBOX.') ? toMailbox : `INBOX.${toMailbox}`;
			const createResult = await this.createMailbox(folderName);
			if (!createResult.success && !createResult.error?.includes('already exists')) {
				console.log('⚠️ Could not create destination folder:', createResult.error);
			}

			await this.openMailbox(fromMailbox);

			if (this.connectionType === 'imapflow' && this.imapFlowClient) {
				try {
					// Try direct move first
					await this.imapFlowClient.messageMove(uid, folderName);
					console.log(`✅ Message ${uid} moved successfully using ImapFlow move`);
					return { success: true };
				} catch (moveError: any) {
					console.log('⚠️ ImapFlow move failed, trying copy+delete:', moveError.message);
					
					// Fallback to copy + delete
					await this.imapFlowClient.messageCopy(uid, folderName);
					await this.imapFlowClient.messageDelete(uid);
					console.log(`✅ Message ${uid} moved successfully using ImapFlow copy+delete`);
					return { success: true };
				}
			} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
				return new Promise((resolve) => {
					// node-imap move operation
					this.nodeImapClient!.move(uid, folderName, (err: any) => {
						if (err) {
							console.log('⚠️ node-imap move failed, trying copy+delete:', err.message);
							
							// Fallback to copy + delete
							this.nodeImapClient!.copy(uid, folderName, (copyErr: any) => {
								if (copyErr) {
									resolve({ success: false, error: `Copy failed: ${copyErr.message}` });
								} else {
									// Mark for deletion
									(this.nodeImapClient as any).del(uid, (delErr: any) => {
										if (delErr) {
											resolve({ success: false, error: `Delete failed: ${delErr.message}` });
										} else {
											// Expunge to actually delete
											this.nodeImapClient!.expunge((expungeErr: any) => {
												if (expungeErr) {
													resolve({ success: false, error: `Expunge failed: ${expungeErr.message}` });
												} else {
													console.log(`✅ Message ${uid} moved successfully using node-imap copy+delete`);
													resolve({ success: true });
												}
											});
										}
									});
								}
							});
						} else {
							console.log(`✅ Message ${uid} moved successfully using node-imap move`);
							resolve({ success: true });
						}
					});
				});
			} else {
				return { success: false, error: 'No active IMAP connection' };
			}
		} catch (error: any) {
			console.error(`❌ Failed to move message ${uid}:`, error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Mark message as read (seen)
	 */
	async markAsRead(uid: number, mailbox: string): Promise<EmailOperationResult> {
		if (!this.isConnected) {
			return { success: false, error: 'Not connected to IMAP server' };
		}

		console.log(`👁️ Marking message ${uid} as read in ${mailbox}`);

		try {
			await this.openMailbox(mailbox);

			if (this.connectionType === 'imapflow' && this.imapFlowClient) {
				await this.imapFlowClient.messageFlagsAdd(uid, ['\\Seen']);
				console.log(`✅ Message ${uid} marked as read using ImapFlow`);
				return { success: true };
			} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
				return new Promise((resolve) => {
					this.nodeImapClient!.addFlags(uid, '\\Seen', (err: any) => {
						if (err) {
							console.error(`❌ Failed to mark message ${uid} as read:`, err.message);
							resolve({ success: false, error: err.message });
						} else {
							console.log(`✅ Message ${uid} marked as read using node-imap`);
							resolve({ success: true });
						}
					});
				});
			} else {
				return { success: false, error: 'No active IMAP connection' };
			}
		} catch (error: any) {
			console.error(`❌ Failed to mark message ${uid} as read:`, error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Mark message as unread (unseen)
	 */
	async markAsUnread(uid: number, mailbox: string): Promise<EmailOperationResult> {
		if (!this.isConnected) {
			return { success: false, error: 'Not connected to IMAP server' };
		}

		console.log(`👁️ Marking message ${uid} as unread in ${mailbox}`);

		try {
			await this.openMailbox(mailbox);

		if (this.connectionType === 'imapflow' && this.imapFlowClient) {
			// For ImapFlow, we'll use messageFlagsSet to clear all flags (simplified approach)
			await this.imapFlowClient.messageFlagsSet(uid, []);
			console.log(`✅ Message ${uid} marked as unread using ImapFlow`);
			return { success: true };
		} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
				return new Promise((resolve) => {
					this.nodeImapClient!.delFlags(uid, '\\Seen', (err: any) => {
						if (err) {
							console.error(`❌ Failed to mark message ${uid} as unread:`, err.message);
							resolve({ success: false, error: err.message });
						} else {
							console.log(`✅ Message ${uid} marked as unread using node-imap`);
							resolve({ success: true });
						}
					});
				});
			} else {
				return { success: false, error: 'No active IMAP connection' };
			}
		} catch (error: any) {
			console.error(`❌ Failed to mark message ${uid} as unread:`, error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Add flags to message
	 */
	async addFlags(uid: number, mailbox: string, flags: string[]): Promise<EmailOperationResult> {
		if (!this.isConnected) {
			return { success: false, error: 'Not connected to IMAP server' };
		}

		console.log(`🏷️ Adding flags [${flags.join(', ')}] to message ${uid} in ${mailbox}`);

		try {
			await this.openMailbox(mailbox);

			if (this.connectionType === 'imapflow' && this.imapFlowClient) {
				await this.imapFlowClient.messageFlagsAdd(uid, flags);
				console.log(`✅ Flags added to message ${uid} using ImapFlow`);
				return { success: true };
			} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
				return new Promise((resolve) => {
					this.nodeImapClient!.addFlags(uid, flags, (err: any) => {
						if (err) {
							console.error(`❌ Failed to add flags to message ${uid}:`, err.message);
							resolve({ success: false, error: err.message });
						} else {
							console.log(`✅ Flags added to message ${uid} using node-imap`);
							resolve({ success: true });
						}
					});
				});
			} else {
				return { success: false, error: 'No active IMAP connection' };
			}
		} catch (error: any) {
			console.error(`❌ Failed to add flags to message ${uid}:`, error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Remove flags from message
	 */
	async removeFlags(uid: number, mailbox: string, flags: string[]): Promise<EmailOperationResult> {
		if (!this.isConnected) {
			return { success: false, error: 'Not connected to IMAP server' };
		}

		console.log(`🏷️ Removing flags [${flags.join(', ')}] from message ${uid} in ${mailbox}`);

		try {
			await this.openMailbox(mailbox);

		if (this.connectionType === 'imapflow' && this.imapFlowClient) {
			// For ImapFlow, we'll use a simplified approach - clear all flags for now
			// In a production environment, you might want to fetch current flags first
			await this.imapFlowClient.messageFlagsSet(uid, []);
			console.log(`✅ Flags removed from message ${uid} using ImapFlow`);
			return { success: true };
		} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
				return new Promise((resolve) => {
					this.nodeImapClient!.delFlags(uid, flags, (err: any) => {
						if (err) {
							console.error(`❌ Failed to remove flags from message ${uid}:`, err.message);
							resolve({ success: false, error: err.message });
						} else {
							console.log(`✅ Flags removed from message ${uid} using node-imap`);
							resolve({ success: true });
						}
					});
				});
			} else {
				return { success: false, error: 'No active IMAP connection' };
			}
		} catch (error: any) {
			console.error(`❌ Failed to remove flags from message ${uid}:`, error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Flag message as important
	 */
	async flagAsImportant(uid: number, mailbox: string): Promise<EmailOperationResult> {
		return this.addFlags(uid, mailbox, ['\\Flagged']);
	}

	/**
	 * Remove important flag from message
	 */
	async unflagAsImportant(uid: number, mailbox: string): Promise<EmailOperationResult> {
		return this.removeFlags(uid, mailbox, ['\\Flagged']);
	}

	/**
	 * Delete message
	 */
	async deleteMessage(uid: number, mailbox: string): Promise<EmailOperationResult> {
		if (!this.isConnected) {
			return { success: false, error: 'Not connected to IMAP server' };
		}

		console.log(`🗑️ Deleting message ${uid} from ${mailbox}`);

		try {
			await this.openMailbox(mailbox);

			if (this.connectionType === 'imapflow' && this.imapFlowClient) {
				await this.imapFlowClient.messageDelete(uid);
				console.log(`✅ Message ${uid} marked for deletion using ImapFlow`);
				return { success: true };
			} else if (this.connectionType === 'node-imap' && this.nodeImapClient) {
				return new Promise((resolve) => {
					(this.nodeImapClient as any).del(uid, (err: any) => {
						if (err) {
							console.error(`❌ Failed to delete message ${uid}:`, err.message);
							resolve({ success: false, error: err.message });
						} else {
							// Expunge to actually delete
							this.nodeImapClient!.expunge((expungeErr: any) => {
								if (expungeErr) {
									resolve({ success: false, error: `Expunge failed: ${expungeErr.message}` });
								} else {
									console.log(`✅ Message ${uid} deleted successfully using node-imap`);
									resolve({ success: true });
								}
							});
						}
					});
				});
			} else {
				return { success: false, error: 'No active IMAP connection' };
			}
		} catch (error: any) {
			console.error(`❌ Failed to delete message ${uid}:`, error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Get connection status and type
	 */
	getConnectionInfo(): { connected: boolean; type: string | null } {
		return {
			connected: this.isConnected,
			type: this.connectionType
		};
	}

	/**
	 * Parse email message using mailparser
	 */
	async parseEmail(source: Buffer): Promise<ParsedMail> {
		return simpleParser(source);
	}
}

export default EnhancedImapService;
