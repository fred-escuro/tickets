import { prisma } from '../index';
import { simpleParser, ParsedMail } from 'mailparser';
import { ImapFlow, type FetchMessageObject } from 'imapflow';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface InboundEmailSettings {
	imapHost: string;
	imapPort: number;
	imapSecure: boolean;
	imapUser: string;
	imapPassword: string;
	folder?: string;
	moveOnSuccessFolder?: string;
	moveOnErrorFolder?: string;
	allowedSenderDomains?: string[];
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
		allowedSenderDomains: Array.isArray(map.allowedSenderDomains) ? map.allowedSenderDomains : undefined,
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
				const existingMsg = await prisma.emailMessage.findUnique({ where: { messageId } }).catch(() => null);
				if (existingMsg) { result.skipped++; await markProcessed(client, msg.uid, settings.moveOnSuccessFolder); continue; }

				const fromObj = (parsed as any).from?.value?.[0];
				const fromEmail = (fromObj?.address || '').toLowerCase();
				const fromName = (fromObj?.name || '').trim();
				if (!fromEmail) {
					result.skipped++;
					await prisma.emailMessage.create({ data: { messageId, type: 'NEW', from: '', to: getAddressesText((parsed as any).to), subject: parsed.subject || '', error: 'No from email', rawMeta: { headers: headersToObject((parsed as any).headers) } as any } as any });
					await markProcessed(client, msg.uid, settings.moveOnErrorFolder);
					continue;
				}
				if (Array.isArray(settings.allowedSenderDomains) && settings.allowedSenderDomains.length > 0) {
					const domain = fromEmail.split('@')[1];
					if (!settings.allowedSenderDomains.includes(domain)) {
						result.skipped++;
						await prisma.emailMessage.create({ data: { messageId, type: 'NEW', from: fromEmail, to: getAddressesText((parsed as any).to), subject: parsed.subject || '', error: 'Sender domain not allowed', rawMeta: { headers: headersToObject((parsed as any).headers) } as any } as any });
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

				if (targetTicketId) {
					// Add as public comment
					const c = await prisma.comment.create({ data: { ticketId: targetTicketId, authorId: userId, content: textContent, isInternal: false } });
					await saveAttachments(parsed, userId, undefined, c.id);
					await prisma.emailMessage.create({ data: { messageId, ticketId: targetTicketId, type: 'REPLY', from: fromEmail, to: getAddressesText((parsed as any).to), subject: parsed.subject || '', rawMeta: { headers: headersToObject((parsed as any).headers) } as any } as any });
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
					await prisma.emailMessage.create({ data: { messageId, from: fromEmail, to: getAddressesText((parsed as any).to), subject: parsed.subject || '', error: 'Missing category/priority/status', rawMeta: { headers: headersToObject((parsed as any).headers) } as any } as any });
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
				await prisma.emailMessage.create({ data: { messageId, ticketId: created.id, type: 'NEW', from: fromEmail, to: getAddressesText((parsed as any).to), subject: title, rawMeta: { headers: headersToObject((parsed as any).headers) } as any } as any });
				result.created++;
				await markProcessed(client, msg.uid, settings.moveOnSuccessFolder);
			} catch (e: any) {
				result.errors++;
				try {
					// Try to record failure
					await prisma.emailMessage.create({ data: { messageId: 'unknown', type: 'NEW', from: '', to: '', subject: '', error: String(e?.message || e) } as any });
				} catch {}
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
			await client.messageMove(uid, dest).catch(async () => { /* ignore move errors */ });
		}
		await client.messageFlagsAdd(uid, ['\\Seen']).catch(() => {});
	} catch {}
}
