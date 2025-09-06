import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { JwtPayload, AuthenticatedRequest } from '../types';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        departmentId: true,
        avatar: true,
        phone: true,
        location: true,
        isAgent: true,
        skills: true,
        createdAt: true,
        updatedAt: true,
        departmentEntity: { select: { id: true, name: true } },
        roles: {
          select: {
            isPrimary: true,
            role: { 
              select: { 
                id: true, 
                name: true,
                permissions: { include: { permission: true } }
              } 
            }
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

    // Flatten permissions from roles to a simple array of keys
    const permissionSet = new Set<string>();
    (user?.roles || []).forEach((ur: any) => {
      const rp = ur?.role?.permissions || [];
      rp.forEach((rpItem: any) => {
        const key = rpItem?.permission?.key;
        if (typeof key === 'string' && key.length > 0) permissionSet.add(key);
      });
    });

    (req as any).user = { ...user, permissions: Array.from(permissionSet) } as any;
    next();
    return;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const userHasAnyRole = (user: any, allowedRoles: string[]): boolean => {
  if (!user) return false;
  const roleNames: string[] = Array.isArray(user.roles)
    ? user.roles.map((r: any) => (r?.role?.name || '').toLowerCase()).filter((n: any) => typeof n === 'string')
    : [];
  const normalized = allowedRoles.map(r => (r || '').toLowerCase());
  return normalized.some(r => roleNames.includes(r));
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check via RBAC roles relation
    if (!userHasAnyRole((req as any).user, roles.map(r => r.toLowerCase()))) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
    return;
  };
};

export const authorizePermission = (...permissionKeys: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: any = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const userPermissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
    const has = permissionKeys.some(p => userPermissions.includes(p));
    if (!has) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
    return;
  };
};

export const requireAgent = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!(req as any).user.isAgent) {
    return res.status(403).json({
      success: false,
      error: 'Agent access required'
    });
  }

  next();
  return;
};
