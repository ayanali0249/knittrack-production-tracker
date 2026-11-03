import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { AuthRequest, JwtPayload } from '../types';

/**
 * Authentication middleware.
 * Extracts JWT from HttpOnly cookie and attaches user payload to request.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
      return;
    }

    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      productionUnitId: payload.productionUnitId,
      buyerId: payload.buyerId,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid authentication token.' });
      return;
    }
    res.status(500).json({ success: false, error: 'Authentication error.' });
  }
}

/**
 * Generate a JWT token for the given user payload.
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}
