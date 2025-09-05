import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { UpdateUserRequest, ApiResponse, CreateUserRequest } from '../types';

const router = Router();

// Create new user (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const createData: CreateUserRequest = req.body;

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: createData.email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password using bcryptjs
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(createData.password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        firstName: createData.firstName,
        lastName: createData.lastName,
        middleName: createData.middleName || undefined,
        email: createData.email,
        password: hashedPassword,
        department: createData.department || undefined,
        avatar: createData.avatar || undefined,
        phone: createData.phone || undefined,
        location: createData.location || undefined,
        isAgent: createData.isAgent || false,
        skills: createData.skills || undefined
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        department: true,
        avatar: true,
        phone: true,
        location: true,
        isAgent: true,
        skills: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, department } = req.query;

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { middleName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) {
      where.roles = {
        some: {
          role: { name: role.toString() }
        }
      } as any;
    }
    if (department) where.department = department;

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        department: true,
        avatar: true,
        phone: true,
        location: true,
        isAgent: true,
        skills: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            isPrimary: true,
            role: {
              select: { id: true, name: true, description: true, isSystem: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const totalPages = Math.ceil(total / limitNum);

    const response: ApiResponse = {
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user.id;

    // Users can only view their own profile unless they're admin
    // Allow if the requester is the same user or has admin role via RBAC
    const requester = (req as any).user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.some((r: any) => r?.role?.name === 'admin');
    if (id !== currentUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        department: true,
        avatar: true,
        phone: true,
        location: true,
        isAgent: true,
        skills: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            isPrimary: true,
            role: {
              select: { id: true, name: true, description: true, isSystem: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

// Update user
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: UpdateUserRequest = req.body;
    const currentUserId = (req as any).user.id;

    // Users can only update their own profile unless they're admin
    // Allow if the requester is the same user or has admin role via RBAC
    const requester = (req as any).user;
    const isAdmin = Array.isArray(requester?.roles) && requester.roles.some((r: any) => r?.role?.name === 'admin');
    if (id !== currentUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName: updateData.firstName || undefined,
        lastName: updateData.lastName || undefined,
        middleName: updateData.middleName || undefined,
        email: updateData.email || undefined,
        // role updates are disabled; RBAC handles roles
        department: updateData.department || undefined,
        avatar: updateData.avatar || undefined,
        phone: updateData.phone || undefined,
        location: updateData.location || undefined,
        isAgent: updateData.isAgent ?? undefined,
        skills: updateData.skills || undefined
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        department: true,
        avatar: true,
        phone: true,
        location: true,
        isAgent: true,
        skills: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Get support agents
router.get('/agents/list', authenticate, async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: { isAgent: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        avatar: true,
        department: true,
        skills: true
      },
      orderBy: { firstName: 'asc' }
    });

    return res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Get agents error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get agents'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (id === (req as any).user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

export default router;

// Additional user role management endpoints
router.get('/:id/roles', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        roles: {
          select: {
            isPrimary: true,
            role: { select: { id: true, name: true, description: true, isSystem: true } }
          }
        }
      }
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, data: user.roles });
  } catch (e) {
    console.error('Get user roles error:', e);
    return res.status(500).json({ success: false, error: 'Failed to get user roles' });
  }
});

router.post('/:id/roles/:roleId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const isPrimary = String(req.query.primary || 'false') === 'true';
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: id, roleId } },
      create: { userId: id, roleId, isPrimary },
      update: { isPrimary }
    } as any);
    return res.json({ success: true, message: 'Role assigned to user' });
  } catch (e) {
    console.error('Assign role to user error:', e);
    return res.status(500).json({ success: false, error: 'Failed to assign role' });
  }
});

router.delete('/:id/roles/:roleId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id, roleId } = req.params;
    await prisma.userRole.deleteMany({ where: { userId: id, roleId } });
    return res.json({ success: true, message: 'Role removed from user' });
  } catch (e) {
    console.error('Remove role from user error:', e);
    return res.status(500).json({ success: false, error: 'Failed to remove role' });
  }
});
