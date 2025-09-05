import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse, CreatePermissionRequest, UpdatePermissionRequest } from '../types';

const router = Router();

// Create permission (admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const data: CreatePermissionRequest = req.body;
    if (!data.key) return res.status(400).json({ success: false, error: 'Key is required' });
    const created = await prisma.permission.create({ data: { key: data.key, description: data.description } });
    return res.status(201).json({ success: true, data: created, message: 'Permission created' });
  } catch (error) {
    console.error('Create permission error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create permission' });
  }
});

// List permissions (admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const perms = await prisma.permission.findMany({ orderBy: { key: 'asc' } });
    return res.json({ success: true, data: perms });
  } catch (error) {
    console.error('List permissions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get permissions' });
  }
});

// Update permission (admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdatePermissionRequest = req.body;
    const updated = await prisma.permission.update({ where: { id }, data: { description: data.description ?? undefined } });
    return res.json({ success: true, data: updated, message: 'Permission updated' });
  } catch (error) {
    console.error('Update permission error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update permission' });
  }
});

// Delete permission (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.permission.delete({ where: { id } });
    return res.json({ success: true, message: 'Permission deleted' });
  } catch (error) {
    console.error('Delete permission error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete permission' });
  }
});

export default router;


