import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { prisma } from '../index';
import nodemailer from 'nodemailer';
import { authenticate, authorizePermission } from '../middleware/auth';

const router = Router();

// Helpers
const nsToObject = (rows: Array<{ key: string; value: any; isSecret?: boolean }>, includeSecrets = false) => {
  const obj: Record<string, any> = {};
  for (const r of rows) {
    if (r.isSecret && !includeSecrets) continue;
    obj[r.key] = r.value;
  }
  return obj;
};

const detectType = (val: any): 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'FILE' => {
  if (typeof val === 'string') return 'STRING';
  if (typeof val === 'number') return 'NUMBER';
  if (typeof val === 'boolean') return 'BOOLEAN';
  if (val && typeof val === 'object') return 'JSON';
  return 'JSON';
};

const ensureDefaults = async (namespaces: string[]) => {
  const db: any = prisma as any;
  const ops: any[] = [];
  if (namespaces.includes('branding')) {
    const appName = await db.appSetting.findUnique({ where: { namespace_key: { namespace: 'branding', key: 'appName' } } });
    if (!appName) {
      ops.push(db.appSetting.create({ data: { namespace: 'branding', key: 'appName', value: 'TicketHub', type: 'STRING' } }));
    }
  }
  if (ops.length) await prisma.$transaction(ops);
};

// Public GET: list namespaces
router.get('/', async (req, res) => {
  try {
    const nsParam = (req.query.ns as string) || '';
    const namespaces = nsParam ? nsParam.split(',').map(s => s.trim()).filter(Boolean) : ['branding'];
    await ensureDefaults(namespaces);
    const db: any = prisma as any;
    const rows = await db.appSetting.findMany({ where: { namespace: { in: namespaces } } });
    const grouped: Record<string, any> = {};
    for (const ns of namespaces) {
      const ofNs = rows.filter((r: any) => r.namespace === ns).map((r: any) => ({ key: r.key, value: r.value, isSecret: r.isSecret }));
      grouped[ns] = nsToObject(ofNs, false);
    }
    return res.json({ success: true, data: grouped });
  } catch (e) {
    console.error('settings v2 get error', e);
    return res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
});

// Admin: get full namespace (non-secret filtering optional)
router.get('/:namespace', authenticate, async (req, res) => {
  try {
    const { namespace } = req.params;
    await ensureDefaults([namespace]);
    const db: any = prisma as any;
    const rows = await db.appSetting.findMany({ where: { namespace } });
    return res.json({ success: true, data: nsToObject(rows, true) });
  } catch (e) {
    console.error('settings v2 get namespace error', e);
    return res.status(500).json({ success: false, error: 'Failed to load namespace' });
  }
});

// Admin: update multiple keys in a namespace
router.put('/:namespace', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { namespace } = req.params;
    const payload = req.body || {};
    const db: any = prisma as any;
    const ops: any[] = [];
    const keys = Object.keys(payload);
    for (const key of keys) {
      const val = payload[key];
      const type = detectType(val);
      ops.push(
        db.appSetting.upsert({
          where: { namespace_key: { namespace, key } },
          update: { value: val, type },
          create: { namespace, key, value: val, type }
        })
      );
      ops.push(
        db.settingHistory.create({
          data: { namespace, key, oldValue: null, newValue: val, changedBy: ((req as any).user?.id) || null }
        })
      );
    }
    await prisma.$transaction(ops);
    // Return updated namespace
    const rows = await db.appSetting.findMany({ where: { namespace } });
    return res.json({ success: true, data: nsToObject(rows, true), message: 'Settings updated' });
  } catch (e) {
    console.error('settings v2 update namespace error', e);
    return res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Admin: update a single key
router.patch('/:namespace/:key', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { namespace, key } = req.params;
    const val = req.body?.value;
    const db: any = prisma as any;
    const existing = await db.appSetting.findUnique({ where: { namespace_key: { namespace, key } } });
    const type = detectType(val);
    const saved = await db.appSetting.upsert({
      where: { namespace_key: { namespace, key } },
      update: { value: val, type },
      create: { namespace, key, value: val, type }
    });
    await db.settingHistory.create({ data: { namespace, key, oldValue: existing?.value || null, newValue: val, changedBy: ((req as any).user?.id) || null } });
    return res.json({ success: true, data: { key, value: saved.value } });
  } catch (e) {
    console.error('settings v2 patch error', e);
    return res.status(500).json({ success: false, error: 'Failed to update key' });
  }
});

// Upload handling for files in a namespace
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `setting-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.post('/:namespace/upload', authenticate, authorizePermission('settings:write'), upload.single('file'), async (req, res) => {
  try {
    const { namespace } = req.params;
    const key = (req.body?.key || req.query?.key || 'file') as string;
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const publicPath = `/uploads/${req.file.filename}`;
    const db: any = prisma as any;
    const existing = await db.appSetting.findUnique({ where: { namespace_key: { namespace, key } } });
    const saved = await db.appSetting.upsert({ where: { namespace_key: { namespace, key } }, update: { value: publicPath, type: 'FILE' }, create: { namespace, key, value: publicPath, type: 'FILE' } });
    await db.settingHistory.create({ data: { namespace, key, oldValue: existing?.value || null, newValue: publicPath, changedBy: ((req as any).user?.id) || null } });
    return res.status(201).json({ success: true, data: { key, value: saved.value } });
  } catch (e) {
    console.error('settings v2 upload error', e);
    return res.status(500).json({ success: false, error: 'Failed to upload file' });
  }
});

// Admin: send test email using current SMTP settings
router.post('/email/smtp/test', authenticate, authorizePermission('settings:write'), async (req, res) => {
  try {
    const { to } = req.body as { to?: string };
    if (!to) return res.status(400).json({ success: false, error: 'Recipient email (to) is required' });

    const db: any = prisma as any;
    const rows = await db.appSetting.findMany({ where: { namespace: 'email.smtp' } });
    const smtp = nsToObject(rows, true) as any;
    const host = smtp.host || process.env.SMTP_HOST;
    const port = Number(smtp.port ?? process.env.SMTP_PORT ?? 587);
    const secure = Boolean(smtp.secure ?? (process.env.SMTP_SECURE === 'true'));
    const user = smtp.user || process.env.SMTP_USER;
    const pass = smtp.password || process.env.SMTP_PASSWORD;
    // Support both name and explicit from email; fallback to user/email
    const rawFrom = (smtp.fromAddress || process.env.SMTP_FROM || user || 'no-reply@example.com') as string;
    const looksLikeEmail = /@/.test(rawFrom);
    const fromEmail = (smtp.fromEmail || (looksLikeEmail ? rawFrom : undefined) || user || process.env.SMTP_FROM || 'no-reply@example.com') as string;
    const fromName = (smtp.fromName || (!looksLikeEmail ? rawFrom : undefined)) as (string | undefined);

    if (!host || !user || !pass) {
      return res.status(400).json({ success: false, error: 'SMTP is not fully configured (host/user/password required)' });
    }

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    // Try to verify first for clearer diagnostics
    try { await transporter.verify(); } catch {}

    // Branding for subject/body
    const appNameRow = await db.appSetting.findUnique({ where: { namespace_key: { namespace: 'branding', key: 'appName' } } });
    const appName = (appNameRow?.value as string) || 'TicketHub';
    const sentAt = new Date();

    const subject = `[${appName}] SMTP Configuration Test`;
    const text = `${appName} SMTP test email

This message confirms your SMTP settings can authenticate and send mail.

Details:
- Sent At: ${sentAt.toISOString()}
- From Name: ${fromName || ''}
- From Email: ${fromEmail}
- To: ${to}
- SMTP Host: ${host}
- Port: ${port}
- TLS/SSL: ${secure ? 'Enabled' : 'Disabled'}

If you received this message, outbound email is working.`;

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif; background:#f6f7f9; margin:0; padding:24px; }
      .card { max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.04); }
      .header { background:#0ea5e9; color:#fff; padding:18px 20px; font-weight:600; font-size:16px; }
      .content { padding:20px; color:#111827; }
      .muted { color:#6b7280; }
      .kvs { width:100%; border-collapse:collapse; margin-top:12px; }
      .kvs th, .kvs td { text-align:left; padding:8px 10px; border-bottom:1px solid #f3f4f6; font-size:14px; }
      .footer { padding:14px 20px; color:#6b7280; font-size:12px; background:#fafafa; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">${appName} · SMTP Configuration Test</div>
      <div class="content">
        <p>Hello,</p>
        <p>This message was sent to verify that outbound email is working for <strong>${appName}</strong>.</p>
        <table class="kvs">
          <tr><th>Sent At</th><td>${sentAt.toLocaleString()}</td></tr>
          <tr><th>From Name</th><td>${fromName || ''}</td></tr>
          <tr><th>From Email</th><td>${fromEmail}</td></tr>
          <tr><th>To</th><td>${to}</td></tr>
          <tr><th>SMTP Host</th><td>${host}</td></tr>
          <tr><th>Port</th><td>${port}</td></tr>
          <tr><th>TLS/SSL</th><td>${secure ? 'Enabled' : 'Disabled'}</td></tr>
        </table>
        <p class="muted" style="margin-top:16px">If you received this email, your SMTP configuration is functioning.</p>
      </div>
      <div class="footer">This is an automated message from ${appName}. Please do not reply.</div>
    </div>
  </body>
</html>`;

    const info = await transporter.sendMail({ from: fromName ? { name: fromName, address: fromEmail } : fromEmail, to, subject, text, html });
    return res.json({ success: true, message: 'Test email sent', data: { messageId: info.messageId } });
  } catch (e) {
    console.error('SMTP test send error:', e);
    return res.status(500).json({ success: false, error: 'Failed to send test email' });
  }
});

export default router;


