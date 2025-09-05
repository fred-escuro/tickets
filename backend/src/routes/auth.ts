import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { CreateUserRequest, LoginRequest, AuthResponse, ApiResponse } from '../types';
import { authenticate } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, middleName, email, password, department, avatar, phone, location, isAgent, skills }: CreateUserRequest = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        middleName,
        email,
        password: hashedPassword,
        // legacy role column no longer used
        department,
        avatar,
        phone,
        location,
        isAgent: isAgent || false,
        skills: skills ? skills : []
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

    // Generate JWT tokens
    const token = (jwt.sign as any)(
      { userId: (user as any).id, email: (user as any).email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = (jwt.sign as any)(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    // Convert Prisma user to our User type format
    const userResponse = {
      ...user,
      middleName: user.middleName || undefined,
      department: user.department || undefined,
      avatar: user.avatar || undefined,
      phone: user.phone || undefined,
      location: user.location || undefined,
      skills: Array.isArray(user.skills) ? user.skills.filter((skill: any) => typeof skill === 'string') : []
    };

    const response: AuthResponse = {
      user: userResponse,
      token,
      refreshToken
    };

    return res.status(201).json({
      success: true,
      data: response,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          select: {
            isPrimary: true,
            role: { select: { id: true, name: true, permissions: { include: { permission: true } } } }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT tokens
    const token = (jwt.sign as any)(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = (jwt.sign as any)(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    const { password: _, ...userWithoutPassword } = user as any;

    // Flatten permissions from role permissions
    const permissionSet = new Set<string>();
    ((user as any).roles || []).forEach((ur: any) => {
      const rp = ur?.role?.permissions || [];
      rp.forEach((rpItem: any) => {
        const key = rpItem?.permission?.key;
        if (typeof key === 'string' && key.length > 0) permissionSet.add(key);
      });
    });

    // Convert Prisma user to our User type format
    const userResponse: any = {
      ...userWithoutPassword,
      middleName: userWithoutPassword.middleName || undefined,
      department: userWithoutPassword.department || undefined,
      avatar: userWithoutPassword.avatar || undefined,
      phone: userWithoutPassword.phone || undefined,
      location: userWithoutPassword.location || undefined,
      skills: Array.isArray(userWithoutPassword.skills) ? userWithoutPassword.skills.filter((skill: any) => typeof skill === 'string') : [],
      roles: (user as any).roles || [],
      permissions: Array.from(permissionSet)
    };

    const response: AuthResponse = {
      user: userResponse,
      token,
      refreshToken
    };

    return res.json({
      success: true,
      data: response,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { userId: string };

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
            role: { select: { id: true, name: true, permissions: { include: { permission: true } } } }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new access token
    const newToken = (jwt.sign as any)(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Convert Prisma user to our User type format
    const permissionSet = new Set<string>();
    ((user as any).roles || []).forEach((ur: any) => {
      const rp = ur?.role?.permissions || [];
      rp.forEach((rpItem: any) => {
        const key = rpItem?.permission?.key;
        if (typeof key === 'string' && key.length > 0) permissionSet.add(key);
      });
    });

    const userResponse: any = {
      ...user,
      middleName: user.middleName || undefined,
      department: user.department || undefined,
      avatar: user.avatar || undefined,
      phone: user.phone || undefined,
      location: user.location || undefined,
      skills: Array.isArray(user.skills) ? user.skills.filter((skill: any) => typeof skill === 'string') : [],
      roles: (user as any).roles || [],
      permissions: Array.from(permissionSet)
    };

    return res.json({
      success: true,
      data: {
        token: newToken,
        user: userResponse
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;

    return res.json({
      success: true,
      data: user,
      message: 'User profile retrieved successfully'
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Logout (optional - client-side token removal)
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a more advanced setup, you might want to blacklist the token
    // For now, we'll just return success and let the client remove the token
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

export default router;
