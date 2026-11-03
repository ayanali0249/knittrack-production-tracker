import { Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { delayService } from '../services/delay.service';
import type { AuthRequest } from '../types';

export class DashboardController {
  /**
   * GET /api/dashboard/summary
   */
  async getSummary(req: AuthRequest, res: Response) {
    const summary = await dashboardService.getSummary(req.user!);
    res.json({ success: true, data: summary });
  }

  /**
   * GET /api/dashboard/delay-overview
   */
  async getDelayOverview(req: AuthRequest, res: Response) {
    const overview = await dashboardService.getDelayOverview(req.user!);
    res.json({ success: true, data: overview });
  }

  /**
   * GET /api/dashboard/efficiency
   */
  async getEfficiency(req: AuthRequest, res: Response) {
    const efficiency = await dashboardService.getEfficiency(req.user!);
    res.json({ success: true, data: efficiency });
  }

  /**
   * GET /api/dashboard/delay/:orderId
   */
  async getOrderDelay(req: AuthRequest, res: Response) {
    const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const analysis = await delayService.analyseOrder(orderId);
    res.json({ success: true, data: analysis });
  }

  /**
   * POST /api/dashboard/recalculate
   */
  async recalculate(_req: AuthRequest, res: Response) {
    const result = await delayService.recalculateAllOrders();
    res.json({ success: true, data: result });
  }
}

export const dashboardController = new DashboardController();
