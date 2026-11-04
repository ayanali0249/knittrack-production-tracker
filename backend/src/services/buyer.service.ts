import prisma from '../lib/prisma';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';
import { delayService } from './delay.service';

export class BuyerService {
  /**
   * Generate a temporary access token for a buyer.
   */
  async generateAccessToken(buyerId: string, expiresInHours: number = 72) {
    const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new AppError('Buyer not found.', 404);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const accessToken = await prisma.buyerAccessToken.create({
      data: {
        buyerId,
        token,
        expiresAt,
      },
    });

    return {
      token: accessToken.token,
      expiresAt: accessToken.expiresAt,
      buyerName: buyer.name,
    };
  }

  /**
   * Validate a buyer access token and return buyer info.
   */
  async validateAccessToken(token: string) {
    const accessToken = await prisma.buyerAccessToken.findUnique({
      where: { token },
      include: { buyer: true },
    });

    if (!accessToken) {
      throw new AppError('Invalid access token.', 401);
    }

    if (accessToken.expiresAt < new Date()) {
      throw new AppError('Access token has expired.', 401);
    }

    return accessToken.buyer;
  }

  /**
   * Get buyer portal data (orders visible to this buyer).
   */
  async getBuyerPortalData(buyerId: string) {
    const buyer = await prisma.buyer.findUnique({
      where: { id: buyerId },
    });

    if (!buyer) throw new AppError('Buyer not found.', 404);

    const orders = await prisma.productionOrder.findMany({
      where: { buyerId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: {
        productionUnit: { select: { name: true, location: true } },
        stages: {
          orderBy: { sequence: 'asc' },
          select: {
            id: true,
            stageName: true,
            sequence: true,
            status: true,
            plannedQuantity: true,
            completedQuantity: true,
            plannedStartDate: true,
            plannedEndDate: true,
            actualStartDate: true,
            actualEndDate: true,
            productionUpdates: {
              where: { buyerWarningApproved: true },
              orderBy: { date: 'desc' },
              select: {
                id: true,
                date: true,
                quantity: true,
                aiCategory: true,
                correctedCategory: true,
                note: true,
                buyerWarningApproved: true,
              },
            },
          },
        },
        photos: {
          where: { approved: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { exFactoryDate: 'asc' },
    });

    // Attach delay analysis for each order
    const ordersWithAnalysis = await Promise.all(
      orders.map(async (order) => {
        try {
          const analysis = await delayService.analyseOrder(order.id);
          return { ...order, delayAnalysis: analysis };
        } catch {
          return { ...order, delayAnalysis: null };
        }
      })
    );

    return {
      buyer,
      orders: ordersWithAnalysis,
    };
  }

  /**
   * Get order detail for buyer portal (with access check).
   */
  async getBuyerOrderDetail(buyerId: string, orderId: string) {
    const order = await prisma.productionOrder.findFirst({
      where: { id: orderId, buyerId },
      include: {
        productionUnit: { select: { name: true, location: true } },
        stages: {
          orderBy: { sequence: 'asc' },
          include: {
            productionUpdates: {
              where: { buyerWarningApproved: true }, // STRICT: Only merchandiser-approved warnings
              orderBy: { date: 'desc' },
              select: {
                id: true,
                date: true,
                quantity: true,
                aiCategory: true,
                correctedCategory: true,
                note: true,
                buyerWarningApproved: true,
              },
            },
          },
        },
        photos: {
          where: { approved: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) throw new AppError('Order not found or access denied.', 404);

    const analysis = await delayService.analyseOrder(order.id);

    return { ...order, delayAnalysis: analysis };
  }
}

export const buyerService = new BuyerService();
