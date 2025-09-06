import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse, CreateDepartmentRequest, UpdateDepartmentRequest } from '../types';

const router = Router();

// Create department (admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const data: CreateDepartmentRequest = req.body;

    if (!data.name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const created = await prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        managerId: data.managerId,
        parentId: data.parentId
      }
    });

    return res.status(201).json({ success: true, data: created, message: 'Department created' });
  } catch (error) {
    console.error('Create department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create department' });
  }
});

// List departments
router.get('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const depts = await prisma.department.findMany({
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { users: true, children: true } }
      },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: depts });
  } catch (error) {
    console.error('List departments error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get departments' });
  }
});

// Get department by id
router.get('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        children: { select: { id: true, name: true } },
        users: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    return res.json({ success: true, data: dept });
  } catch (error) {
    console.error('Get department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get department' });
  }
});

// Update department (admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateDepartmentRequest = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Department not found' });

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        managerId: data.managerId === null ? null : data.managerId ?? undefined,
        parentId: data.parentId === null ? null : data.parentId ?? undefined
      }
    });

    return res.json({ success: true, data: updated, message: 'Department updated' });
  } catch (error) {
    console.error('Update department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update department' });
  }
});

// Delete department (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Department not found' });

    // Ensure no users are assigned before delete
    const countUsers = await prisma.user.count({ where: { departmentId: id } });
    if (countUsers > 0) {
      return res.status(400).json({ success: false, error: 'Department has assigned users; reassign them first' });
    }

    await prisma.department.delete({ where: { id } });
    return res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    console.error('Delete department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete department' });
  }
});

// Assign user to department (admin/manager)
router.post('/:id/users/:userId', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const [dept, user] = await Promise.all([
      prisma.department.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: userId } })
    ]);

    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { departmentId: id }
    });

    return res.json({ success: true, data: { id: updated.id, departmentId: id }, message: 'User assigned to department' });
  } catch (error) {
    console.error('Assign user to department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to assign user' });
  }
});

// Remove user from department (admin/manager)
router.delete('/:id/users/:userId', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id, userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.departmentId !== id) return res.status(400).json({ success: false, error: 'User is not in this department' });

    await prisma.user.update({ where: { id: userId }, data: { departmentId: null } });
    return res.json({ success: true, message: 'User removed from department' });
  } catch (error) {
    console.error('Remove user from department error:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove user' });
  }
});

export default router;


