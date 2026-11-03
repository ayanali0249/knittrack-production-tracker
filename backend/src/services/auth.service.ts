import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import type { JwtPayload } from '../types';

export class AuthService {
  /**
   * Authenticate a user with email and password.
   * Returns a JWT token on success.
   */
  async login(email: string, password: string): Promise<{ token: string; user: JwtPayload & { name: string } }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Contact administrator.', 403);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      productionUnitId: user.productionUnitId,
      buyerId: user.buyerId,
    };

    const token = generateToken(payload);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        details: { ip: 'logged-at-controller-level' },
      },
    });

    return {
      token,
      user: {
        ...payload,
        name: user.name,
      },
    };
  }

  /**
   * Get the current user's profile.
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        productionUnitId: true,
        productionUnit: { select: { id: true, name: true, location: true } },
        buyerId: true,
        buyer: { select: { id: true, name: true, country: true } },
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return user;
  }
}

export const authService = new AuthService();
