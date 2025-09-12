import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { CreateUserRequest, LoginRequest, AuthResponse, ApiResponse, JwtPayload } from '../types';
import { authenticate } from '../middleware/auth';
import { OAuth2Client } from 'google-auth-library';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, middleName, email, password, avatar, phone, location, isAgent, skills }: CreateUserRequest = req.body;

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
        avatar,
        phone,
        location,
        isAgent: isAgent || false,
        skills: skills ? skills : [],
        emailVerificationToken: (await (await import('crypto')).randomBytes(32)).toString('hex'),
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        departments: {
          select: {
            id: true,
            isPrimary: true,
            role: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
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
// Request email verification link (resend)
router.post('/verify-email/request', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ success: true, message: 'If the email exists, a verification link was sent' });
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { emailVerificationToken: token, emailVerificationExpires: expires } });
    const includeTokenInResponse = process.env.NODE_ENV !== 'production';
    return res.json({ success: true, message: 'Verification link sent', ...(includeTokenInResponse ? { data: { token, expiresAt: expires } } : {}) });
  } catch (e) {
    console.error('Verify email request error:', e);
    return res.status(500).json({ success: false, error: 'Failed to send verification link' });
  }
});

// Verify email
router.post('/verify-email/confirm', async (req, res) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });
    const user = await prisma.user.findFirst({ where: { emailVerificationToken: token, emailVerificationExpires: { gt: new Date() } } });
    if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date(), emailVerificationToken: null, emailVerificationExpires: null } });
    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (e) {
    console.error('Verify email error:', e);
    return res.status(500).json({ success: false, error: 'Failed to verify email' });
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

    // Generate JWT tokens with session timestamps
    const now = Date.now();
    const token = (jwt.sign as any)(
      { 
        userId: user.id, 
        email: user.email,
        sessionStart: now,
        lastActivity: now
      },
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

// Verify token (alias of /me but without full roles if needed)
router.get('/verify', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    return res.json({ success: true, data: user, message: 'Token is valid' });
  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify token' });
  }
});

// Refresh session (update lastActivity timestamp)
router.post('/refresh-session', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Create new token with updated lastActivity timestamp
    const now = Date.now();
    const updatedToken = (jwt.sign as any)(
      { 
        userId: decoded.userId, 
        email: decoded.email,
        sessionStart: decoded.sessionStart || now, // Keep original session start
        lastActivity: now // Update last activity
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      data: { token: updatedToken },
      message: 'Session refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh session error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh session'
    });
  }
});

// Forgot password - request reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond success to prevent user enumeration
    const genericResponse = {
      success: true,
      message: 'If the email exists, a reset link has been sent'
    };

    if (!user) return res.json(genericResponse);

    // Generate a secure token and expiry (1 hour)
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires }
    });

    // TODO: Send email with reset URL. For now, return token in dev for testing.
    const includeTokenInResponse = process.env.NODE_ENV !== 'production';
    return res.json({
      ...genericResponse,
      ...(includeTokenInResponse ? { data: { resetToken: token, expiresAt: expires } } : {})
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// Reset password - complete reset with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    return res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// Social login with Google ID token
router.post('/social-login', async (req, res) => {
  try {
    const { provider, idToken } = req.body as { provider?: string; idToken?: string };

    if (!provider || provider !== 'google') {
      return res.status(400).json({ success: false, error: 'Unsupported provider' });
    }

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'ID token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ success: false, error: 'Google client ID not configured' });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({ success: false, error: 'Invalid Google token' });
    }

    const email = payload.email;
    const firstName = (payload.given_name as string) || 'User';
    const lastName = (payload.family_name as string) || '';
    const avatar = (payload.picture as string) || undefined;
    const providerId = payload.sub as string;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const crypto = await import('crypto');
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashed = await bcrypt.hash(randomPassword, 12);
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName: lastName || 'Google',
          password: hashed,
          avatar,
          oauthProvider: 'google',
          oauthProviderId: providerId,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        }
      });
    } else {
      // Update provider metadata and last login
      await prisma.user.update({
        where: { id: user.id },
        data: { oauthProvider: 'google', oauthProviderId: providerId, avatar, emailVerifiedAt: user.emailVerifiedAt ?? new Date(), lastLoginAt: new Date() }
      });
    }

    // Re-fetch user with roles
    const dbUser = await prisma.user.findUnique({
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

    if (!dbUser) {
      return res.status(500).json({ success: false, error: 'Failed to complete social login' });
    }

    // Issue tokens
    const token = (jwt.sign as any)(
      { userId: dbUser.id, email: dbUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = (jwt.sign as any)(
      { userId: dbUser.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    const { password: _pw, ...userWithoutPassword } = dbUser as any;

    const permissionSet = new Set<string>();
    ((dbUser as any).roles || []).forEach((ur: any) => {
      const rp = ur?.role?.permissions || [];
      rp.forEach((rpItem: any) => {
        const key = rpItem?.permission?.key;
        if (typeof key === 'string' && key.length > 0) permissionSet.add(key);
      });
    });

    const userResponse: any = {
      ...userWithoutPassword,
      middleName: userWithoutPassword.middleName || undefined,
      avatar: userWithoutPassword.avatar || undefined,
      phone: userWithoutPassword.phone || undefined,
      location: userWithoutPassword.location || undefined,
      skills: Array.isArray(userWithoutPassword.skills) ? userWithoutPassword.skills.filter((s: any) => typeof s === 'string') : [],
      roles: (dbUser as any).roles || [],
      permissions: Array.from(permissionSet)
    };

    const response: AuthResponse = { user: userResponse, token, refreshToken };

    return res.json({ success: true, data: response, message: 'Social login successful' });
  } catch (error) {
    console.error('Social login error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process social login' });
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
        departments: {
          select: {
            id: true,
            isPrimary: true,
            role: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
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

    // Generate new access token with session timestamps
    const now = Date.now();
    const newToken = (jwt.sign as any)(
      { 
        userId: user.id, 
        email: user.email,
        sessionStart: now, // Start new session on refresh
        lastActivity: now
      },
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
