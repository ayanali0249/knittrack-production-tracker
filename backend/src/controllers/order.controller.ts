import { Response } from 'express';
import { orderService } from '../services/order.service';
import { PAGINATION } from '../lib/constants';
import type { AuthRequest } from '../types';

export class OrderController {
  /**
   * GET /api/orders
   */
  async list(req: AuthRequest, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT)
    );

    const result = await orderService.listOrders(
      req.user!,
      {
        status: req.query.status as any,
        riskLevel: req.query.riskLevel as any,
        buyerId: req.query.buyerId as string,
        productionUnitId: req.query.productionUnitId as string,
        search: req.query.search as string,
      },
      {
        page,
        limit,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      }
    );

    res.json({ success: true, ...result });
  }

  /**
   * GET /api/orders/:id
   */
  async getById(req: AuthRequest, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const order = await orderService.getOrder(id, req.user!);
    res.json({ success: true, data: order });
  }

  /**
   * POST /api/orders
   */
  async create(req: AuthRequest, res: Response) {
    const order = await orderService.createOrder(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: order });
  }

  /**
   * PUT /api/orders/:id
   */
  async update(req: AuthRequest, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const order = await orderService.updateOrder(id, req.body, req.user!.userId);
    res.json({ success: true, data: order });
  }

  /**
   * DELETE /api/orders/:id
   */
  async remove(req: AuthRequest, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await orderService.deleteOrder(id, req.user!.userId);
    res.json({ success: true, message: 'Order cancelled successfully.' });
  }

  /**
   * GET /api/orders/buyers
   */
  async getBuyers(_req: AuthRequest, res: Response) {
    const buyers = await orderService.getBuyers();
    res.json({ success: true, data: buyers });
  }

  /**
   * GET /api/orders/production-units
   */
  async getProductionUnits(_req: AuthRequest, res: Response) {
    const units = await orderService.getProductionUnits();
    res.json({ success: true, data: units });
  }
}

export const orderController = new OrderController();
