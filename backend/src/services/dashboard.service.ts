import prisma from '../lib/prisma';
import { RiskLevel, OrderStatus } from '@prisma/client';
import { delayService } from './delay.service';
import type { JwtPayload, DashboardSummary } from '../types';
import { normalizeDate } from '../lib/delayCalculation';

export class DashboardService {
  /**
   * Get dashboard summary data.
   */
  async getSummary(user: JwtPayload): Promise<DashboardSummary> {
    const baseWhere = this.buildScopeFilter(user);

    // Aggregate counts
    const [totalOrders, activeOrders, completedOrders, riskCounts, statusCounts] = await Promise.all([
      prisma.productionOrder.count({ where: baseWhere }),
      prisma.productionOrder.count({ where: { ...baseWhere, status: OrderStatus.ACTIVE } }),
      prisma.productionOrder.count({ where: { ...baseWhere, status: OrderStatus.COMPLETED } }),
      prisma.productionOrder.groupBy({
        by: ['riskLevel'],
        where: { ...baseWhere, status: OrderStatus.ACTIVE },
        _count: true,
      }),
      prisma.productionOrder.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
    ]);

    // Build risk/status maps
    const ordersByRisk: Record<string, number> = { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 };
    for (const r of riskCounts) {
      ordersByRisk[r.riskLevel] = r._count;
    }

    const ordersByStatus: Record<string, number> = {};
    for (const s of statusCounts) {
      ordersByStatus[s.status] = s._count;
    }

    // Upcoming deadlines (next 30 days)
    const today = normalizeDate(new Date());
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const upcoming = await prisma.productionOrder.findMany({
      where: {
        ...baseWhere,
        status: OrderStatus.ACTIVE,
        exFactoryDate: { gte: today, lte: thirtyDaysLater },
      },
      select: {
        id: true,
        poNumber: true,
        exFactoryDate: true,
        riskLevel: true,
      },
      orderBy: { exFactoryDate: 'asc' },
      take: 10,
    });

    const upcomingDeadlines = upcoming.map((o) => ({
      orderId: o.id,
      poNumber: o.poNumber,
      exFactoryDate: o.exFactoryDate,
      riskLevel: o.riskLevel,
      daysUntilDeadline: Math.ceil(
        (o.exFactoryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // Recent updates
    const recentUpdates = await prisma.productionUpdate.findMany({
      where: user.role === 'SUPERVISOR' && user.productionUnitId
        ? { orderStage: { order: { productionUnitId: user.productionUnitId } } }
        : user.role === 'BUYER' && user.buyerId
          ? { orderStage: { order: { buyerId: user.buyerId } } }
          : {},
      include: {
        supervisor: { select: { name: true } },
        orderStage: {
          select: {
            stageName: true,
            order: { select: { poNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      totalOrders,
      activeOrders,
      completedOrders,
      onTrackCount: ordersByRisk.ON_TRACK,
      atRiskCount: ordersByRisk.AT_RISK,
      delayedCount: ordersByRisk.DELAYED,
      ordersByStatus,
      ordersByRisk,
      upcomingDeadlines,
      recentUpdates: recentUpdates.map((u) => ({
        id: u.id,
        date: u.date,
        quantity: u.quantity,
        stageName: u.orderStage.stageName,
        poNumber: u.orderStage.order.poNumber,
        supervisorName: u.supervisor.name,
      })),
    };
  }

  /**
   * Get delay analysis for all active orders (dashboard view).
   */
  async getDelayOverview(user: JwtPayload) {
    const analyses = await delayService.analyseAllOrders();

    // Apply role-based filtering
    if (user.role === 'BUYER' && user.buyerId) {
      const buyerOrders = await prisma.productionOrder.findMany({
        where: { buyerId: user.buyerId, status: 'ACTIVE' },
        select: { id: true },
      });
      const buyerOrderIds = new Set(buyerOrders.map((o) => o.id));
      return analyses.filter((a) => buyerOrderIds.has(a.orderId));
    }

    if (user.role === 'SUPERVISOR' && user.productionUnitId) {
      const unitOrders = await prisma.productionOrder.findMany({
        where: { productionUnitId: user.productionUnitId, status: 'ACTIVE' },
        select: { id: true },
      });
      const unitOrderIds = new Set(unitOrders.map((o) => o.id));
      return analyses.filter((a) => unitOrderIds.has(a.orderId));
    }

    return analyses;
  }

  /**
   * Get production efficiency data.
   */
  async getEfficiency(user: JwtPayload) {
    const baseWhere = this.buildScopeFilter(user);

    const orders = await prisma.productionOrder.findMany({
      where: { ...baseWhere, status: 'ACTIVE' },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        buyer: { select: { name: true } },
      },
    });

    return orders.map((order) => {
      const totalPlanned = order.stages.reduce((sum, s) => sum + s.plannedQuantity, 0);
      const totalCompleted = order.stages.reduce((sum, s) => sum + s.completedQuantity, 0);
      const overallProgress = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

      return {
        orderId: order.id,
        poNumber: order.poNumber,
        buyerName: order.buyer.name,
        styleName: order.styleName,
        totalQuantity: order.totalQuantity,
        overallProgress,
        riskLevel: order.riskLevel,
        exFactoryDate: order.exFactoryDate,
        stages: order.stages.map((s) => ({
          stageName: s.stageName,
          progress: s.plannedQuantity > 0
            ? Math.round((s.completedQuantity / s.plannedQuantity) * 100)
            : 0,
          status: s.status,
        })),
      };
    });
  }

  private buildScopeFilter(user: JwtPayload) {
    if (user.role === 'BUYER' && user.buyerId) {
      return { buyerId: user.buyerId };
    }
    if (user.role === 'SUPERVISOR' && user.productionUnitId) {
      return { productionUnitId: user.productionUnitId };
    }
    return {};
  }
}

export const dashboardService = new DashboardService();
