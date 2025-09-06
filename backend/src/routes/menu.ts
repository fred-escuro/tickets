import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import type { CreateMenuItemRequest, UpdateMenuItemRequest } from '../types';

const router = Router();

// GET /api/menu - returns a permission-filtered hierarchical menu
router.get('/', authenticate, async (req, res) => {
  try {
    const userPermissions = new Set<string>(Array.isArray((req as any).user?.permissions) ? (req as any).user.permissions : []);

    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      include: { permissions: { include: { permission: true } } },
    });

    // Filter by required permissions: if a menu has no permissions, it's visible to all authenticated users
    const allowed = items.filter(i =>
      (i.permissions?.length ?? 0) === 0 || i.permissions.every(mp => userPermissions.has(mp.permission.key))
    );

    // Build id -> node map
    const byId = new Map<string, any>(
      allowed.map(i => [
        i.id,
        {
          id: i.id,
          parentId: i.parentId,
          label: i.label,
          path: i.path,
          icon: i.icon,
          sortOrder: i.sortOrder,
          isActive: i.isActive,
          featureFlag: i.featureFlag ?? undefined,
          children: [] as any[],
        },
      ])
    );

    const roots: any[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Optionally prune empty parents (no path and no children)
    const pruneEmpty = (nodes: any[]): any[] =>
      nodes
        .map(n => ({ ...n, children: pruneEmpty(n.children) }))
        .filter(n => n.path || n.children.length > 0);

    const tree = pruneEmpty(roots);

    return res.json({ success: true, data: tree });
  } catch (error) {
    console.error('Get menu error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get menu' });
  }
});

export default router;

// Admin CRUD for menu items
router.post('/items', authenticate, authorize('admin'), async (req, res) => {
  try {
    const data: CreateMenuItemRequest = req.body;
    if (!data.label) return res.status(400).json({ success: false, error: 'Label is required' });

    const created = await prisma.menuItem.create({
      data: {
        parentId: data.parentId ?? null,
        label: data.label,
        path: data.path ?? null,
        icon: data.icon ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        featureFlag: data.featureFlag ?? null,
      },
    });
    return res.status(201).json({ success: true, data: created, message: 'Menu item created' });
  } catch (error) {
    console.error('Create menu item error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create menu item' });
  }
});

router.get('/items', authenticate, authorize('admin'), async (req, res) => {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      include: { permissions: { include: { permission: true } } },
    });
    return res.json({ success: true, data: items });
  } catch (error) {
    console.error('List menu items error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get menu items' });
  }
});

router.put('/items/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateMenuItemRequest = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Menu item not found' });

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        parentId: data.parentId === null ? null : data.parentId ?? undefined,
        label: data.label ?? undefined,
        path: data.path === null ? null : data.path ?? undefined,
        icon: data.icon === null ? null : data.icon ?? undefined,
        sortOrder: data.sortOrder ?? undefined,
        isActive: data.isActive ?? undefined,
        featureFlag: data.featureFlag === null ? null : data.featureFlag ?? undefined,
      },
    });
    return res.json({ success: true, data: updated, message: 'Menu item updated' });
  } catch (error) {
    console.error('Update menu item error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update menu item' });
  }
});

router.delete('/items/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    return res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete menu item' });
  }
});

// Manage permission links for a menu item
router.post('/items/:id/permissions/:permissionId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id, permissionId } = req.params;
    await prisma.menuItemPermission.upsert({
      where: { menuItemId_permissionId: { menuItemId: id, permissionId } },
      create: { menuItemId: id, permissionId },
      update: {},
    } as any);
    return res.json({ success: true, message: 'Permission linked to menu item' });
  } catch (error) {
    console.error('Link permission to menu item error:', error);
    return res.status(500).json({ success: false, error: 'Failed to link permission' });
  }
});

router.delete('/items/:id/permissions/:permissionId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id, permissionId } = req.params;
    await prisma.menuItemPermission.deleteMany({ where: { menuItemId: id, permissionId } });
    return res.json({ success: true, message: 'Permission unlinked from menu item' });
  } catch (error) {
    console.error('Unlink permission from menu item error:', error);
    return res.status(500).json({ success: false, error: 'Failed to unlink permission' });
  }
});


