import { Request, Response } from 'express';
import { buyerService } from '../services/buyer.service';
import type { AuthRequest } from '../types';

export class BuyerController {
  /**
   * POST /api/buyer/token
   * Generate a buyer access token (admin/merchandiser only).
   */
  async generateToken(req: AuthRequest, res: Response) {
    const { buyerId, expiresInHours } = req.body;
    const result = await buyerService.generateAccessToken(buyerId, expiresInHours);
    res.status(201).json({ success: true, data: result });
  }

  /**
   * GET /api/buyer/portal
   * Buyer portal data via access token (query param) or authenticated buyer user.
   */
  async getPortalData(req: AuthRequest, res: Response) {
    let buyerId: string;

    // Check for token-based access
    const accessToken = req.query.token as string;
    if (accessToken) {
      const buyer = await buyerService.validateAccessToken(accessToken);
      buyerId = buyer.id;
    } else if (req.user?.buyerId) {
      buyerId = req.user.buyerId;
    } else {
      res.status(401).json({ success: false, error: 'Buyer access required.' });
      return;
    }

    const data = await buyerService.getBuyerPortalData(buyerId);
    res.json({ success: true, data });
  }

  /**
   * GET /api/buyer/portal/:orderId
   * Buyer portal order detail.
   */
  async getOrderDetail(req: AuthRequest, res: Response) {
    let buyerId: string;

    const accessToken = req.query.token as string;
    if (accessToken) {
      const buyer = await buyerService.validateAccessToken(accessToken);
      buyerId = buyer.id;
    } else if (req.user?.buyerId) {
      buyerId = req.user.buyerId;
    } else {
      res.status(401).json({ success: false, error: 'Buyer access required.' });
      return;
    }

    const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const data = await buyerService.getBuyerOrderDetail(buyerId, orderId);
    res.json({ success: true, data });
  }
}

export const buyerController = new BuyerController();
