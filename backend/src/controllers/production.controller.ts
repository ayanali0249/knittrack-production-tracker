import { Response } from 'express';
import { productionService } from '../services/production.service';
import type { AuthRequest } from '../types';

export class ProductionController {
  /**
   * POST /api/production/updates
   */
  async submitUpdate(req: AuthRequest, res: Response) {
    const update = await productionService.submitUpdate(req.body, req.user!, req.file);
    res.status(201).json({ success: true, data: update });
  }

  /**
   * PUT /api/production/updates/:id
   */
  async editUpdate(req: AuthRequest, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const update = await productionService.editUpdate(id, req.body, req.user!);
    res.json({ success: true, data: update });
  }

  /**
   * GET /api/production/updates
   */
  async getUpdates(req: AuthRequest, res: Response) {
    const updates = await productionService.getUpdates(
      {
        orderStageId: req.query.orderStageId as string,
        orderId: req.query.orderId as string,
        supervisorId: req.query.supervisorId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      },
      req.user!
    );
    res.json({ success: true, data: updates });
  }

  /**
   * GET /api/production/timeline/:orderId
   */
  async getTimeline(req: AuthRequest, res: Response) {
    const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const timeline = await productionService.getOrderTimeline(orderId, req.user!);
    res.json({ success: true, data: timeline });
  }
}

export const productionController = new ProductionController();
