import { Router } from 'express';
import { authenticate, authorize, authorizePermission } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

// Statuses
router.get('/statuses', authenticate, async (_req, res) => {
  try {
    const rows = await (prisma as any).taskStatusDef.findMany({ orderBy: { sortOrder: 'asc' } });
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Get task statuses error:', e);
    return res.status(500).json({ success: false, error: 'Failed to get task statuses' });
  }
});

router.post('/statuses', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { key, name, color } = req.body as any;
    if (!key || !name) return res.status(400).json({ success: false, error: 'key and name are required' });

    // Prevent duplicate name (case-sensitive equality)
    const existingByName = await (prisma as any).taskStatusDef.findFirst({ where: { name } });
    if (existingByName) {
      return res.status(400).json({ success: false, error: `Status with name "${name}" already exists` });
    }

    // Get next sort order
    const last = await (prisma as any).taskStatusDef.findFirst({ orderBy: { sortOrder: 'desc' } });
    const created = await (prisma as any).taskStatusDef.create({
      data: {
        key: String(key).toUpperCase(),
        name,
        color: color || 'blue',
        sortOrder: ((last?.sortOrder as number) || 0) + 1
      }
    });
    return res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    // Handle unique constraint on key gracefully
    if (e?.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Status key must be unique' });
    }
    return res.status(500).json({ success: false, error: e?.message || 'Failed to create status' });
  }
});

router.put('/statuses/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { key, name, color, sortOrder } = req.body as any;
    const updated = await (prisma as any).taskStatusDef.update({
      where: { id },
      data: {
        key: key ? String(key).toUpperCase() : undefined,
        name,
        color,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined
      }
    });
    return res.json({ success: true, data: updated });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Status key must be unique' });
    }
    return res.status(500).json({ success: false, error: e?.message || 'Failed to update status' });
  }
});

router.delete('/statuses/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent deletion if in use by tasks
    const usingCount = await (prisma as any).ticketTask.count({ where: { taskStatusId: id } });
    if (usingCount > 0) {
      return res.status(400).json({ success: false, error: `Cannot delete status. It is currently being used by ${usingCount} task(s).` });
    }
    await (prisma as any).taskStatusDef.delete({ where: { id } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to delete status' });
  }
});

// Priorities
router.get('/priorities', authenticate, async (_req, res) => {
  try {
    const rows = await (prisma as any).taskPriorityDef.findMany({ orderBy: { sortOrder: 'asc' } });
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Get task priorities error:', e);
    return res.status(500).json({ success: false, error: 'Failed to get task priorities' });
  }
});

router.post('/priorities', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { key, name, color, level } = req.body as any;
    if (!key || !name || level === undefined) return res.status(400).json({ success: false, error: 'key, name and level are required' });

    // Check duplicate level
    const existingLevel = await (prisma as any).taskPriorityDef.findFirst({ where: { level: Number(level) } });
    if (existingLevel) {
      return res.status(400).json({ success: false, error: `Priority level ${Number(level)} already exists` });
    }

    // Get next sort order
    const last = await (prisma as any).taskPriorityDef.findFirst({ orderBy: { sortOrder: 'desc' } });
    const created = await (prisma as any).taskPriorityDef.create({
      data: {
        key: String(key).toUpperCase(),
        name,
        color: color || 'blue',
        level: Number(level) || 0,
        sortOrder: ((last?.sortOrder as number) || 0) + 1
      }
    });
    return res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Priority key must be unique' });
    }
    return res.status(500).json({ success: false, error: e?.message || 'Failed to create priority' });
  }
});

router.put('/priorities/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { key, name, color, level, sortOrder } = req.body as any;
    // If level is changing, ensure it's not duplicate
    if (level !== undefined) {
      const existingLevel = await (prisma as any).taskPriorityDef.findFirst({ where: { level: Number(level), NOT: { id } } });
      if (existingLevel) {
        return res.status(400).json({ success: false, error: `Priority level ${Number(level)} already exists` });
      }
    }
    const updated = await (prisma as any).taskPriorityDef.update({
      where: { id },
      data: {
        key: key ? String(key).toUpperCase() : undefined,
        name,
        color,
        level: level !== undefined ? Number(level) : undefined,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined
      }
    });
    return res.json({ success: true, data: updated });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Priority key must be unique' });
    }
    return res.status(500).json({ success: false, error: e?.message || 'Failed to update priority' });
  }
});

router.delete('/priorities/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent deletion if in use by tasks
    const usingCount = await (prisma as any).ticketTask.count({ where: { taskPriorityId: id } });
    if (usingCount > 0) {
      return res.status(400).json({ success: false, error: `Cannot delete priority. It is currently being used by ${usingCount} task(s).` });
    }
    await (prisma as any).taskPriorityDef.delete({ where: { id } });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to delete priority' });
  }
});

export default router;


