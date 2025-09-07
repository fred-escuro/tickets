import { Router } from 'express';
import { authenticate, authorizePermission } from '../middleware/auth';
import { runEmailIngestOnce } from '../services/emailIngest';

const router = Router();

router.post('/run', authenticate, authorizePermission('settings:write'), async (req, res) => {
	try {
		const result = await runEmailIngestOnce();
		return res.json({ success: true, data: result });
	} catch (e: any) {
		return res.status(500).json({ success: false, error: e?.message || 'Failed to ingest emails' });
	}
});

export default router;
