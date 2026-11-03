import prisma from '../lib/prisma';
import { analyseOrder, type OrderInput, type StageInput } from '../lib/delayCalculation';
import { RiskLevel } from '@prisma/client';
import type { OrderDelayAnalysis } from '../types';

export class DelayService {
  /**
   * Run delay analysis for a single order.
   */
  async analyseOrder(orderId: string, referenceDate?: Date): Promise<OrderDelayAnalysis> {
    const order = await prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderInput: OrderInput = {
      id: order.id,
      poNumber: order.poNumber,
      exFactoryDate: order.exFactoryDate,
      stages: order.stages.map((s): StageInput => ({
        id: s.id,
        stageName: s.stageName,
        sequence: s.sequence,
        plannedStartDate: s.plannedStartDate,
        plannedEndDate: s.plannedEndDate,
        actualStartDate: s.actualStartDate,
        actualEndDate: s.actualEndDate,
        plannedQuantity: s.plannedQuantity,
        completedQuantity: s.completedQuantity,
        status: s.status,
      })),
    };

    return analyseOrder(orderInput, referenceDate);
  }

  /**
   * Recalculate and persist the risk level for an order.
   * Called after production updates.
   */
  async recalculateOrderRisk(orderId: string): Promise<RiskLevel> {
    const analysis = await this.analyseOrder(orderId);

    await prisma.productionOrder.update({
      where: { id: orderId },
      data: { riskLevel: analysis.overallRiskLevel },
    });

    // Also update stage statuses based on delay analysis
    for (const stageAnalysis of analysis.stages) {
      if (stageAnalysis.riskLevel === RiskLevel.DELAYED && stageAnalysis.status !== 'COMPLETED') {
        await prisma.orderStage.update({
          where: { id: stageAnalysis.stageId },
          data: { status: 'DELAYED' },
        });
      }
    }

    return analysis.overallRiskLevel;
  }

  /**
   * Recalculate risk levels for ALL active orders.
   */
  async recalculateAllOrders(): Promise<{ updated: number; results: Array<{ orderId: string; riskLevel: RiskLevel }> }> {
    const activeOrders = await prisma.productionOrder.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    const results: Array<{ orderId: string; riskLevel: RiskLevel }> = [];

    for (const order of activeOrders) {
      try {
        const riskLevel = await this.recalculateOrderRisk(order.id);
        results.push({ orderId: order.id, riskLevel });
      } catch (err) {
        console.error(`Failed to recalculate order ${order.id}:`, err);
      }
    }

    return { updated: results.length, results };
  }

  /**
   * Get delay analysis for all active orders.
   */
  async analyseAllOrders(referenceDate?: Date): Promise<OrderDelayAnalysis[]> {
    const activeOrders = await prisma.productionOrder.findMany({
      where: { status: 'ACTIVE' },
      include: { stages: { orderBy: { sequence: 'asc' } } },
    });

    return activeOrders.map((order) => {
      const orderInput: OrderInput = {
        id: order.id,
        poNumber: order.poNumber,
        exFactoryDate: order.exFactoryDate,
        stages: order.stages.map((s): StageInput => ({
          id: s.id,
          stageName: s.stageName,
          sequence: s.sequence,
          plannedStartDate: s.plannedStartDate,
          plannedEndDate: s.plannedEndDate,
          actualStartDate: s.actualStartDate,
          actualEndDate: s.actualEndDate,
          plannedQuantity: s.plannedQuantity,
          completedQuantity: s.completedQuantity,
          status: s.status,
        })),
      };
      return analyseOrder(orderInput, referenceDate);
    });
  }
}

export const delayService = new DelayService();
