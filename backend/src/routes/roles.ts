import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse, CreateRoleRequest, UpdateRoleRequest } from '../types';

const router = Router();

// Create role (admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const data: CreateRoleRequest = req.body;
    if (!data.name) return res.status(400).json({ success: false, error: 'Name is required' });

    const created = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: data.isSystem ?? false
      }
    });

    // Attach permissions if provided
    if (Array.isArray(data.permissionIds) && data.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map(pid => ({ roleId: created.id, permissionId: pid })),
        skipDuplicates: true
      });
    }

    const role = await prisma.role.findUnique({
      where: { id: created.id },
      include: {
        permissions: { include: { permission: true } }
      }
    });

    return res.status(201).json({ success: true, data: role, message: 'Role created' });
  } catch (error) {
    console.error('Create role error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create role' });
  }
});

// List roles
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: roles });
  } catch (error) {
    console.error('List roles error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get roles' });
  }
});

// Update role (admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateRoleRequest = req.body;

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Role not found' });
    if (existing.isSystem && data.name && data.name !== existing.name) {
      return res.status(400).json({ success: false, error: 'System roles cannot be renamed' });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        isSystem: data.isSystem ?? undefined
      }
    });

    return res.json({ success: true, data: updated, message: 'Role updated' });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

// Delete role (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Role not found' });
    if (existing.isSystem) return res.status(400).json({ success: false, error: 'System roles cannot be deleted' });

    await prisma.role.delete({ where: { id } });
    return res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    console.error('Delete role error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete role' });
  }
});

// Assign permission to role (admin)
router.post('/:id/permissions/:permissionId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id, permissionId } = req.params;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: id, permissionId } },
      create: { roleId: id, permissionId },
      update: {}
    } as any);
    return res.json({ success: true, message: 'Permission assigned to role' });
  } catch (error) {
    console.error('Assign permission error:', error);
    return res.status(500).json({ success: false, error: 'Failed to assign permission' });
  }
});

// Remove permission from role (admin)
router.delete('/:id/permissions/:permissionId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id, permissionId } = req.params;
    await prisma.rolePermission.deleteMany({ where: { roleId: id, permissionId } });
    return res.json({ success: true, message: 'Permission removed from role' });
  } catch (error) {
    console.error('Remove permission error:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove permission' });
  }
});

// Assign role to user (admin)
router.post('/:id/users/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id, userId } = req.params;
    const primary = Boolean((req.query.primary ?? 'false') === 'true');
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: id } },
      create: { userId, roleId: id, isPrimary: primary },
      update: { isPrimary: primary }
    } as any);
    return res.json({ success: true, message: 'Role assigned to user' });
  } catch (error) {
    console.error('Assign role to user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to assign role' });
  }
});

// Remove role from user (admin)
router.delete('/:id/users/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id, userId } = req.params;
    await prisma.userRole.deleteMany({ where: { userId, roleId: id } });
    return res.json({ success: true, message: 'Role removed from user' });
  } catch (error) {
    console.error('Remove role from user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove role' });
  }
});

export default router;


