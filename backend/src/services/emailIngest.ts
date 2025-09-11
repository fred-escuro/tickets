import { prisma } from '../index';
import { simpleParser, ParsedMail } from 'mailparser';
import { ImapFlow, type FetchMessageObject } from 'imapflow';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { emailTrackingService } from './emailTrackingService';
import { autoResponseGenerator } from './autoResponseGenerator';
import { EmailMessageType } from '@prisma/client';

export interface InboundEmailSettings {
	imapHost: string;
	imapPort: number;
	imapSecure: boolean;
	imapUser: string;
	imapPassword: string;
	folder?: string;
	moveOnSuccessFolder?: string;
	moveOnErrorFolder?: string;
	// Legacy domain restriction (for backward compatibility)
	allowedSenderDomains?: string[];
	// New comprehensive restrictions
	domainRestrictionMode?: 'allow_all' | 'disallow_all' | 'whitelist' | 'blacklist';
	allowedDomains?: string[];
	blockedDomains?: string[];
	maxEmailsPerHour?: number;
	maxEmailsPerDay?: number;
	maxEmailsPerSender?: number;
	enableFloodingProtection?: boolean;
	enableSpamFilter?: boolean;
	requireValidFrom?: boolean;
	blockEmptySubjects?: boolean;
	blockAutoReplies?: boolean;
	enableRateLimiting?: boolean;
	rateLimitWindow?: number;
	maxAttachments?: number;
	maxAttachmentSize?: number;
	// Legacy settings
	defaultCategoryId?: string | null;
	defaultPriorityId?: string | null;
	autoreplyEnabled?: boolean;
	autoreplyFromName?: string;
	autoreplyFromEmail?: string;
}

export interface IngestResult {
	fetched: number;
	created: number;
	replies: number;
	skipped: number;
	errors: number;
}

function ensureDir(dir: string) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getAddressesText(addr: any): string {
	if (!addr) return '';
	try {
		if (typeof addr.text === 'string') return addr.text;
		if (Array.isArray(addr?.value)) return addr.value.map((v: any) => v?.address || '').filter(Boolean).join(', ');
		if (Array.isArray(addr)) return addr.map((v: any) => v?.address || v?.text || '').filter(Boolean).join(', ');
		return '';
	} catch { return ''; }
}

function headersToObject(headers: any): any {
	try {
		if (!headers) return {};
		if (typeof (headers as any).entries === 'function') {
			const iter = (headers as any).entries() as Iterable<[string, any]>;
			return Object.fromEntries(iter);
		}
		if (typeof (headers as any)[Symbol.iterator] === 'function') {
			return Object.fromEntries((headers as any) as Iterable<[string, any]>);
		}
		return headers;
	} catch { return {}; }
}

function isAutoReply(parsed: ParsedMail): boolean {
	const subject = (parsed.subject || '').toLowerCase();
	const headers = headersToObject(parsed.headers);
	
	// Check for common auto-reply indicators
	const autoReplyIndicators = [
		'auto-reply', 'automatic reply', 'out of office', 'vacation', 'away message',
		'autoresponder', 'auto response', 'delivery status', 'mail delivery',
		'undeliverable', 'bounce', 'returned mail', 'mailer-daemon'
	];
	
	// Check subject for auto-reply patterns
	if (autoReplyIndicators.some(indicator => subject.includes(indicator))) {
		return true;
	}
	
	// Check headers for auto-reply indicators
	const autoReplyHeaders = [
		'X-Autoreply', 'X-Autorespond', 'X-Autoresponse', 'X-Autoreply-From',
		'X-Vacation', 'X-Away', 'X-Out-Of-Office', 'Precedence', 'X-Precedence'
	];
	
	for (const header of autoReplyHeaders) {
		if (headers[header]) {
			return true;
		}
	}
	
	// Check for precedence: bulk or auto-reply
	const precedence = headers['Precedence'] || headers['X-Precedence'];
	if (precedence && (precedence.toLowerCase().includes('bulk') || precedence.toLowerCase().includes('auto'))) {
		return true;
	}
	
	return false;
}

async function loadInboundSettings(): Promise<InboundEmailSettings> {
	const rows = await (prisma as any).appSetting.findMany({ where: { namespace: 'email.inbound' } });
	const map: Record<string, any> = {};
	for (const r of rows) map[r.key] = r.value;
	return {
		imapHost: map.imapHost || process.env.IMAP_HOST,
		imapPort: Number(map.imapPort ?? process.env.IMAP_PORT ?? 993),
		imapSecure: Boolean(map.imapSecure ?? (process.env.IMAP_SECURE === 'true')),
		imapUser: map.imapUser || process.env.IMAP_USER,
		imapPassword: map.imapPassword || process.env.IMAP_PASSWORD,
		folder: map.folder || 'INBOX',
		moveOnSuccessFolder: map.moveOnSuccessFolder || 'Processed',
		moveOnErrorFolder: map.moveOnErrorFolder || 'Errors',
		// Legacy domain restriction (for backward compatibility)
		allowedSenderDomains: Array.isArray(map.allowedSenderDomains) ? map.allowedSenderDomains : undefined,
		// New comprehensive restrictions
		domainRestrictionMode: map.domainRestrictionMode || 'allow_all',
		allowedDomains: Array.isArray(map.allowedDomains) ? map.allowedDomains : [],
		blockedDomains: Array.isArray(map.blockedDomains) ? map.blockedDomains : [],
		maxEmailsPerHour: Number(map.maxEmailsPerHour ?? 100),
		maxEmailsPerDay: Number(map.maxEmailsPerDay ?? 1000),
		maxEmailsPerSender: Number(map.maxEmailsPerSender ?? 10),
		enableFloodingProtection: !!map.enableFloodingProtection,
		enableSpamFilter: !!map.enableSpamFilter,
		requireValidFrom: !!map.requireValidFrom,
		blockEmptySubjects: !!map.blockEmptySubjects,
		blockAutoReplies: !!map.blockAutoReplies,
		enableRateLimiting: !!map.enableRateLimiting,
		rateLimitWindow: Number(map.rateLimitWindow ?? 60),
		maxAttachments: Number(map.maxAttachments ?? 10),
		maxAttachmentSize: Number(map.maxAttachmentSize ?? 25),
		// Legacy settings
		defaultCategoryId: map.defaultCategoryId || null,
		defaultPriorityId: map.defaultPriorityId || null,
		autoreplyEnabled: !!map.autoreplyEnabled,
		autoreplyFromName: map.autoreplyFromName || undefined,
		autoreplyFromEmail: map.autoreplyFromEmail || undefined,
	};
}

function extractTicketNumber(subject?: string): number | null {
	if (!subject) return null;
	const m = subject.match(/#(\d{1,10})/);
	return m ? parseInt(m[1], 10) : null;
}

async function findOrCreateUserByEmail(email: string, name?: string): Promise<string> {
	const existing = await prisma.user.findUnique({ where: { email } }).catch(() => null);
	if (existing) return existing.id;
	const [firstName, ...rest] = (name || email.split('@')[0] || 'User').split(' ');
	const lastName = rest.join(' ') || 'User';
	const password = await bcrypt.hash('Temp123!' + Math.random().toString(36).slice(2), 10);
	const created = await prisma.user.create({
		data: { firstName, lastName, email, password, isAgent: false },
	});
	return created.id;
}

async function saveAttachments(parsed: ParsedMail, uploadedBy: string, ticketId?: string, commentId?: string) {
	const uploadPath = process.env.UPLOAD_PATH || path.resolve(process.cwd(), 'uploads');
	ensureDir(uploadPath);
	for (const att of parsed.attachments || []) {
		const ext = att.filename ? path.extname(att.filename) : '';
		const safeName = (att.filename || 'attachment')
			.replace(/[^a-zA-Z0-9._-]/g, '_')
			.slice(0, 120);
		const fname = `email-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || ''}`;
		const fpath = path.join(uploadPath, fname);
		fs.writeFileSync(fpath, att.content as Buffer);
		await prisma.attachment.create({
			data: {
				ticketId,
				commentId,
				name: safeName || fname,
				filePath: `/uploads/${fname}`,
				fileSize: (att.size as number) || (att.content as Buffer).length,
				mimeType: att.contentType || 'application/octet-stream',
				uploadedBy,
			},
		});
	}
}

export async function runEmailIngestOnce(): Promise<IngestResult> {
	const result: IngestResult = { fetched: 0, created: 0, replies: 0, skipped: 0, errors: 0 };
	const settings = await loadInboundSettings();
	if (!settings.imapHost || !settings.imapUser || !settings.imapPassword) {
		throw new Error('Inbound email is not fully configured');
	}

	const client = new ImapFlow({
		host: settings.imapHost,
		port: settings.imapPort,
		secure: settings.imapSecure,
		auth: { user: settings.imapUser, pass: settings.imapPassword },
		logger: false,
	});

	await client.connect();
	try {
		await client.mailboxOpen(settings.folder || 'INBOX');
		const q = { seen: false } as any;
		const messages: Array<FetchMessageObject & { uid: number }> = [] as any;
		for await (const msg of client.fetch(q, { uid: true, source: true, envelope: true })) {
			messages.push(msg as any);
		}
		result.fetched = messages.length;

		for (const msg of messages) {
			try {
				const parsed = await simpleParser((msg as any).source);
				const messageId = (parsed.messageId || '').trim();
				if (!messageId) { result.skipped++; await markProcessed(client, msg.uid, settings.moveOnErrorFolder); continue; }
				const existingEmail = await prisma.emailLog.findUnique({ where: { messageId } }).catch(() => null);
				if (existingEmail) { result.skipped++; await markProcessed(client, msg.uid, settings.moveOnSuccessFolder); continue; }

				const fromObj = (parsed as any).from?.value?.[0];
				const fromEmail = (fromObj?.address || '').toLowerCase();
				const fromName = (fromObj?.name || '').trim();
				if (!fromEmail) {
					result.skipped++;
					await prisma.emailLog.create({ 
						data: { 
							messageId, 
							direction: 'INBOUND' as any,
							type: 'NEW' as any, 
							from: '', 
							to: getAddressesText((parsed as any).to), 
							subject: parsed.subject || '', 
							status: 'ERROR' as any,
							error: 'No from email', 
							rawMeta: { headers: headersToObject((parsed as any).headers) } as any 
						} 
					});
					await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
					continue;
				}
				// Apply comprehensive domain restrictions
				const domain = fromEmail.split('@')[1];
				let domainAllowed = true;
				let domainError = '';

				if (settings.domainRestrictionMode === 'disallow_all') {
					// Disallow all mode: no domains are permitted
					domainAllowed = false;
					domainError = 'All domains are blocked';
				} else if (settings.domainRestrictionMode === 'whitelist') {
					// Whitelist mode: only allowed domains are permitted
					if (settings.allowedDomains && settings.allowedDomains.length > 0) {
						domainAllowed = settings.allowedDomains.includes(domain);
						domainError = 'Sender domain not in whitelist';
					}
				} else if (settings.domainRestrictionMode === 'blacklist') {
					// Blacklist mode: blocked domains are rejected
					if (settings.blockedDomains && settings.blockedDomains.length > 0) {
						domainAllowed = !settings.blockedDomains.includes(domain);
						domainError = 'Sender domain is blacklisted';
					}
				}
				// Legacy support: if new system not configured, fall back to old allowedSenderDomains
				else if (Array.isArray(settings.allowedSenderDomains) && settings.allowedSenderDomains.length > 0) {
					domainAllowed = settings.allowedSenderDomains.includes(domain);
					domainError = 'Sender domain not allowed';
				}

				if (!domainAllowed) {
					result.skipped++;
					await prisma.emailLog.create({ 
						data: { 
							messageId, 
							direction: 'INBOUND' as any,
							type: 'NEW' as any, 
							from: fromEmail, 
							to: getAddressesText((parsed as any).to), 
							subject: parsed.subject || '', 
							status: 'ERROR' as any,
							error: domainError, 
							rawMeta: { headers: headersToObject((parsed as any).headers) } as any 
						} 
					});
					await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
					continue;
				}

				// Apply content filtering restrictions
				if (settings.requireValidFrom && !fromEmail) {
					result.skipped++;
					await prisma.emailLog.create({ 
						data: { 
							messageId, 
							direction: 'INBOUND' as any,
							type: 'NEW' as any, 
							from: fromEmail, 
							to: getAddressesText((parsed as any).to), 
							subject: parsed.subject || '', 
							status: 'ERROR' as any,
							error: 'Invalid or missing from address', 
							rawMeta: { headers: headersToObject((parsed as any).headers) } as any 
						} 
					});
					await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
					continue;
				}

				if (settings.blockEmptySubjects && (!parsed.subject || parsed.subject.trim() === '')) {
					result.skipped++;
					await prisma.emailLog.create({ 
						data: { 
							messageId, 
							direction: 'INBOUND' as any,
							type: 'NEW' as any, 
							from: fromEmail, 
							to: getAddressesText((parsed as any).to), 
							subject: parsed.subject || '', 
							status: 'ERROR' as any,
							error: 'Empty subject not allowed', 
							rawMeta: { headers: headersToObject((parsed as any).headers) } as any 
						} 
					});
					await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
					continue;
				}

				if (settings.blockAutoReplies && isAutoReply(parsed)) {
					result.skipped++;
					await prisma.emailLog.create({ 
						data: { 
							messageId, 
							direction: 'INBOUND' as any,
							type: 'NEW' as any, 
							from: fromEmail, 
							to: getAddressesText((parsed as any).to), 
							subject: parsed.subject || '', 
							status: 'ERROR' as any,
							error: 'Auto-reply detected and blocked', 
							rawMeta: { headers: headersToObject((parsed as any).headers) } as any 
						} 
					});
					await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
					continue;
				}

				// Apply attachment restrictions
				const attachments = parsed.attachments || [];
				if (settings.maxAttachments && attachments.length > settings.maxAttachments) {
					result.skipped++;
					await prisma.emailLog.create({ 
						data: { 
							messageId, 
							direction: 'INBOUND' as any,
							type: 'NEW' as any, 
							from: fromEmail, 
							to: getAddressesText((parsed as any).to), 
							subject: parsed.subject || '', 
							status: 'ERROR' as any,
							error: `Too many attachments (${attachments.length}/${settings.maxAttachments})`, 
							rawMeta: { headers: headersToObject((parsed as any).headers) } as any 
						} 
					});
					await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
					continue;
				}

				if (settings.maxAttachmentSize) {
					const maxSizeBytes = settings.maxAttachmentSize * 1024 * 1024; // Convert MB to bytes
					const oversizedAttachments = attachments.filter((att: any) => (att.size || 0) > maxSizeBytes);
					if (oversizedAttachments.length > 0) {
						result.skipped++;
						await prisma.emailLog.create({ 
							data: { 
								messageId, 
								direction: 'INBOUND' as any,
								type: 'NEW' as any, 
								from: fromEmail, 
								to: getAddressesText((parsed as any).to), 
								subject: parsed.subject || '', 
								status: 'ERROR' as any,
								error: `Attachment too large (max ${settings.maxAttachmentSize}MB)`, 
								rawMeta: { headers: headersToObject((parsed as any).headers) } as any 
							} 
						});
						await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
						continue;
					}
				}

				// Determine whether this is a reply
				let targetTicketId: string | null = null;
				// Try by subject tag
				const num = extractTicketNumber(parsed.subject || '');
				if (num && Number.isFinite(num)) {
					const t = await prisma.ticket.findFirst({ where: { ticketNumber: num } });
					if (t) targetTicketId = t.id;
				}

				// Find or create submitter
				const userId = await findOrCreateUserByEmail(fromEmail, fromName);
				const textContent = (parsed.text && parsed.text.trim()) || parsed.html || '(no content)';

				// Track the inbound email
				const emailLogId = await emailTrackingService.trackInboundEmail({
					messageId,
					from: fromEmail,
					to: getAddressesText((parsed as any).to),
					subject: parsed.subject || '',
					text: parsed.text,
					html: typeof parsed.html === 'string' ? parsed.html : undefined,
					receivedAt: new Date(),
					rawMeta: { headers: headersToObject((parsed as any).headers) },
					attachments: parsed.attachments?.map(att => ({
						filename: att.filename,
						contentType: att.contentType,
						size: att.size,
					})),
					options: {
						ticketId: targetTicketId || undefined,
						userId,
						type: targetTicketId ? EmailMessageType.REPLY : EmailMessageType.NEW,
					},
				});

				if (targetTicketId) {
					// Add as public comment
					const c = await prisma.comment.create({ data: { ticketId: targetTicketId, authorId: userId, content: textContent, isInternal: false } });
					await saveAttachments(parsed, userId, undefined, c.id);
					
					// Update email log with ticket association
					await prisma.emailLog.update({
						where: { id: emailLogId },
						data: { 
							ticketId: targetTicketId,
							status: 'PROCESSED' as any,
						},
					});
					
					result.replies++;
					await markProcessed(client, msg.uid, settings.moveOnSuccessFolder);
					continue;
				}

				// Create new ticket
				const category = settings.defaultCategoryId
					? await prisma.ticketCategory.findUnique({ where: { id: settings.defaultCategoryId } })
					: await prisma.ticketCategory.findFirst({ where: {}, orderBy: { sortOrder: 'asc' } });
				const priority = settings.defaultPriorityId
					? await prisma.ticketPriority.findUnique({ where: { id: settings.defaultPriorityId } })
					: await prisma.ticketPriority.findFirst({ where: { name: 'Medium' } }) || await prisma.ticketPriority.findFirst();
				const status = await prisma.ticketStatus.findFirst({ where: { name: 'Open' } }) || await prisma.ticketStatus.findFirst();
				if (!category || !priority || !status) {
					result.errors++;
					await prisma.emailLog.create({ 
						data: { 
							messageId, 
							direction: 'INBOUND' as any,
							type: 'NEW' as any,
							from: fromEmail, 
							to: getAddressesText((parsed as any).to), 
							subject: parsed.subject || '', 
							status: 'ERROR' as any,
							error: 'Missing category/priority/status', 
							rawMeta: { headers: headersToObject((parsed as any).headers) } as any 
						} 
					});
					await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
					continue;
				}

				const title = parsed.subject || 'Email Ticket';
				const created = await prisma.ticket.create({
					data: {
						title,
						description: textContent,
						categoryId: category.id,
						priorityId: priority.id,
						statusId: status.id,
						submittedBy: userId,
						tags: [],
						source: 'EMAIL' as any,
					},
					select: { id: true }
				});
				await saveAttachments(parsed, userId, created.id, undefined);
				
				// Update email log with ticket association
				await prisma.emailLog.update({
					where: { id: emailLogId },
					data: { 
						ticketId: created.id,
						status: 'PROCESSED' as any,
					},
				});
				
				// Process auto-response for new ticket
				try {
					const ticket = await prisma.ticket.findUnique({
						where: { id: created.id },
						include: {
							submitter: true,
							assignee: true,
							assignedToDepartment: true,
							category: true,
							priority: true,
							status: true,
						},
					});
					
					if (ticket) {
						await autoResponseGenerator.processTicketForAutoResponse(ticket, {
							from: fromEmail,
							subject: parsed.subject || '',
							body: textContent,
							messageId: messageId,
						});
					}
				} catch (autoResponseError) {
					console.error('Error processing auto-response for new ticket:', autoResponseError);
					// Don't fail the entire email processing if auto-response fails
				}
				
				result.created++;
				await markProcessed(client, msg.uid, settings.moveOnSuccessFolder);
			} catch (e: any) {
				result.errors++;
				try {
					// Track error in modern email_logs system
					await prisma.emailLog.create({ 
						data: { 
							messageId: 'unknown', 
							direction: 'INBOUND' as any,
							type: 'NEW' as any, 
							from: '', 
							to: '', 
							subject: '', 
							status: 'ERROR' as any,
							error: String(e?.message || e) 
						} 
					});
				} catch (logError) {
					console.error('Failed to log email processing error:', logError);
				}
				await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
			}
		}
	} finally {
		try { await client.logout(); } catch {}
	}

	return result;
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	const chunks: Buffer[] = [];
	return new Promise((resolve, reject) => {
		stream.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
		stream.on('end', () => resolve(Buffer.concat(chunks)));
		stream.on('error', reject);
	});
}

async function markProcessed(client: ImapFlow, uid: number, dest?: string) {
	try {
		if (dest) {
			try {
				await client.messageMove(uid, dest);
				console.log(`✅ Moved message ${uid} to folder: ${dest}`);
			} catch (moveError: any) {
				console.error(`❌ Failed to move message ${uid} to folder ${dest}:`, moveError.message);
				// Try to create the folder if it doesn't exist
				try {
					await client.mailboxCreate(dest);
					console.log(`📁 Created folder: ${dest}`);
					// Retry the move after creating the folder
					await client.messageMove(uid, dest);
					console.log(`✅ Successfully moved message ${uid} to newly created folder: ${dest}`);
				} catch (createError: any) {
					console.error(`❌ Failed to create folder ${dest}:`, createError.message);
				}
			}
		}
		
		// Mark as seen regardless of move success
		try {
			await client.messageFlagsAdd(uid, ['\\Seen']);
			console.log(`👁️ Marked message ${uid} as seen`);
		} catch (flagError: any) {
			console.error(`❌ Failed to mark message ${uid} as seen:`, flagError.message);
		}
	} catch (error: any) {
		console.error(`❌ Error in markProcessed for message ${uid}:`, error.message);
	}
}
