import { Response } from 'express';
import { authService } from '../services/auth.service';
import { COOKIE_OPTIONS } from '../lib/constants';
import { config } from '../config';
import type { AuthRequest } from '../types';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  async login(req: AuthRequest, res: Response) {
    const { email, password } = req.body;
    const { token, user } = await authService.login(email, password);

    res.cookie('token', token, {
      ...COOKIE_OPTIONS,
      secure: !config.isDev,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.userId,
          email: user.email,
          name: user.name,
          role: user.role,
          productionUnitId: user.productionUnitId,
          buyerId: user.buyerId,
        },
      },
    });
  }

  /**
   * POST /api/auth/logout
   */
  async logout(_req: AuthRequest, res: Response) {
    res.clearCookie('token', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully.' });
  }

  /**
   * GET /api/auth/me
   */
  async me(req: AuthRequest, res: Response) {
    const user = await authService.getMe(req.user!.userId);
    res.json({ success: true, data: user });
  }
}

export const authController = new AuthController();
