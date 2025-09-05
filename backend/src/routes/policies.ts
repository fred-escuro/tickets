import { Router } from 'express';
import { prisma } from '../index';
import { Prisma } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse, CreateAccessPolicyRequest, UpdateAccessPolicyRequest } from '../types';

const router = Router();

// Create policy (admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const data: CreateAccessPolicyRequest = req.body;
    if (!data.name || !data.subjectType || !data.resource || !data.action) {
      return res.status(400).json({ success: false, error: 'name, subjectType, resource, action are required' });
    }

    const created = await prisma.accessPolicy.create({
      data: {
        name: data.name,
        description: data.description,
        effect: data.effect || 'ALLOW',
        subjectType: data.subjectType as any,
        subjectId: data.subjectId,
        resource: data.resource,
        action: data.action,
        conditions: data.conditions || undefined,
        isActive: data.isActive ?? true
      }
    });

    return res.status(201).json({ success: true, data: created, message: 'Policy created' });
  } catch (error) {
    console.error('Create policy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create policy' });
  }
});

// List policies (admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const policies = await prisma.accessPolicy.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: policies });
  } catch (error) {
    console.error('List policies error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get policies' });
  }
});

// Get policy by id (admin)
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await prisma.accessPolicy.findUnique({ where: { id } });
    if (!policy) return res.status(404).json({ success: false, error: 'Policy not found' });
    return res.json({ success: true, data: policy });
  } catch (error) {
    console.error('Get policy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get policy' });
  }
});

// Update policy (admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateAccessPolicyRequest = req.body;
    const updated = await prisma.accessPolicy.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        effect: data.effect as any ?? undefined,
        subjectType: data.subjectType as any ?? undefined,
        subjectId: data.subjectId === null ? null : data.subjectId ?? undefined,
        resource: data.resource ?? undefined,
        action: data.action ?? undefined,
        conditions: data.conditions === null ? Prisma.DbNull : data.conditions ?? undefined,
        isActive: data.isActive ?? undefined
      }
    });
    return res.json({ success: true, data: updated, message: 'Policy updated' });
  } catch (error) {
    console.error('Update policy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update policy' });
  }
});

// Delete policy (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.accessPolicy.delete({ where: { id } });
    return res.json({ success: true, message: 'Policy deleted' });
  } catch (error) {
    console.error('Delete policy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete policy' });
  }
});

export default router;


