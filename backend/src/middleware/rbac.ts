import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import type { AuthRequest } from '../types';

/**
 * Role-based access control middleware factory.
 * Returns a middleware that only allows access to users with one of the specified roles.
 *
 * Usage: router.get('/admin-only', authenticate, requireRole('ADMIN'), handler)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}
