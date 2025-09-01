import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, authorize } from '../middleware/auth';
import { UpdateUserRequest, ApiResponse } from '../types';

const router = Router();

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
    if (role) where.role = role;
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
        role: true,
        department: true,
        avatar: true,
        phone: true,
        location: true,
        isAgent: true,
        skills: true,
        createdAt: true,
        updatedAt: true
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
    if (id !== currentUserId && (req as any).user.role !== 'admin') {
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
        role: true,
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
    if (id !== currentUserId && (req as any).user.role !== 'admin') {
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
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        role: true,
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

export default router;
