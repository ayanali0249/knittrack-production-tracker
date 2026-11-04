import prisma from '../lib/prisma';
import { StageStatus, OrderStatus, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { delayService } from './delay.service';
import type { JwtPayload, CreateProductionUpdateInput } from '../types';

export class ProductionService {
  /**
   * Submit a daily production update for a stage.
   * Supervisors can only update stages in their production unit.
   */
  async submitUpdate(
    input: CreateProductionUpdateInput,
    user: JwtPayload,
    file?: Express.Multer.File
  ) {
    // Load stage with order info
    const stage = await prisma.orderStage.findUnique({
      where: { id: input.orderStageId },
      include: {
        order: {
          select: { id: true, poNumber: true, productionUnitId: true, status: true },
        },
      },
    });

    if (!stage) throw new AppError('Order stage not found.', 404);

    // Supervisor can only update their own production unit
    if (user.role === 'SUPERVISOR' && stage.order.productionUnitId !== user.productionUnitId) {
      throw new AppError('You can only submit updates for your assigned production unit.', 403);
    }

    if (stage.order.status !== OrderStatus.ACTIVE) {
      throw new AppError(`Cannot update a ${stage.order.status} order.`, 400);
    }

    if (input.quantity < 0) {
      throw new AppError('Quantity cannot be negative.', 400);
    }

    // Idempotency check via clientRequestId (offline queue sync deduplication)
    if (input.clientRequestId) {
      const existingByReqId = await prisma.productionUpdate.findUnique({
        where: { clientRequestId: input.clientRequestId },
        include: {
          supervisor: { select: { id: true, name: true } },
          orderStage: { select: { id: true, stageName: true } },
        },
      });

      if (existingByReqId) {
        // Idempotent duplicate: return existing update without duplicate insertion or stage increment
        return existingByReqId;
      }
    }

    // Check for duplicate (same stage + supervisor + date)
    const updateDate = new Date(input.date);
    const existingUpdate = await prisma.productionUpdate.findUnique({
      where: {
        orderStageId_supervisorId_date: {
          orderStageId: input.orderStageId,
          supervisorId: user.userId,
          date: updateDate,
        },
      },
    });

    if (existingUpdate) {
      throw new AppError('You have already submitted an update for this stage on this date. Use the edit endpoint instead.', 409);
    }

    // Calculate new completed quantity
    const newCompleted = stage.completedQuantity + input.quantity;
    const stageComplete = newCompleted >= stage.plannedQuantity;

    // Transaction: create update + update stage
    const result = await prisma.$transaction(async (tx) => {
      // Create production update
      const update = await tx.productionUpdate.create({
        data: {
          orderStageId: input.orderStageId,
          supervisorId: user.userId,
          date: updateDate,
          quantity: input.quantity,
          note: input.note,
          originalNote: input.note, // Preserve original for AI
          clientRequestId: input.clientRequestId || null,
        },
        include: {
          supervisor: { select: { id: true, name: true } },
          orderStage: { select: { id: true, stageName: true } },
        },
      });

      // Save attached photograph if provided
      if (file) {
        await tx.productionPhoto.create({
          data: {
            productionUpdateId: update.id,
            orderId: stage.order.id,
            filename: file.filename,
            path: file.path,
            mimeType: file.mimetype,
            size: file.size,
            approved: false,
          },
        });
      }

      // Update stage quantities and status
      const stageUpdate: Prisma.OrderStageUpdateInput = {
        completedQuantity: { increment: input.quantity },
      };

      // Set actualStartDate if first update
      if (!stage.actualStartDate) {
        stageUpdate.actualStartDate = updateDate;
      }

      // Update status
      if (stageComplete) {
        stageUpdate.status = StageStatus.COMPLETED;
        stageUpdate.actualEndDate = updateDate;
      } else if (stage.status === StageStatus.NOT_STARTED) {
        stageUpdate.status = StageStatus.IN_PROGRESS;
      }

      await tx.orderStage.update({
        where: { id: input.orderStageId },
        data: stageUpdate,
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: 'SUBMIT_UPDATE',
          entityType: 'ProductionUpdate',
          entityId: update.id,
          details: {
            orderId: stage.order.id,
            poNumber: stage.order.poNumber,
            stageName: stage.stageName,
            quantity: input.quantity,
            date: input.date,
          },
        },
      });

      return update;
    });

    // Recalculate risk level asynchronously (non-blocking)
    delayService.recalculateOrderRisk(stage.order.id).catch(console.error);

    return result;
  }

  /**
   * Edit an existing production update (quantity or note).
   */
  async editUpdate(
    updateId: string,
    input: { quantity?: number; note?: string },
    user: JwtPayload
  ) {
    const existing = await prisma.productionUpdate.findUnique({
      where: { id: updateId },
      include: {
        orderStage: {
          include: { order: { select: { id: true, productionUnitId: true } } },
        },
      },
    });

    if (!existing) throw new AppError('Production update not found.', 404);

    // Only the original supervisor or admin can edit
    if (user.role !== 'ADMIN' && existing.supervisorId !== user.userId) {
      throw new AppError('You can only edit your own updates.', 403);
    }

    const quantityDiff = input.quantity !== undefined ? input.quantity - existing.quantity : 0;

    const result = await prisma.$transaction(async (tx) => {
      const update = await tx.productionUpdate.update({
        where: { id: updateId },
        data: {
          ...(input.quantity !== undefined && { quantity: input.quantity }),
          ...(input.note !== undefined && { note: input.note }),
        },
      });

      // Adjust stage completed quantity
      if (quantityDiff !== 0) {
        await tx.orderStage.update({
          where: { id: existing.orderStageId },
          data: { completedQuantity: { increment: quantityDiff } },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: 'EDIT_UPDATE',
          entityType: 'ProductionUpdate',
          entityId: updateId,
          details: { previousQuantity: existing.quantity, ...input },
        },
      });

      return update;
    });

    delayService.recalculateOrderRisk(existing.orderStage.order.id).catch(console.error);

    return result;
  }

  /**
   * Approve or revoke a buyer-facing warning/issue note.
   * Only Merchandisers and Admins can approve warnings.
   * Unapproved warnings are completely hidden from the buyer portal.
   */
  async approveBuyerWarning(updateId: string, approved: boolean = true, user: JwtPayload) {
    const update = await prisma.productionUpdate.findUnique({
      where: { id: updateId },
      include: {
        orderStage: {
          include: {
            order: { select: { id: true, poNumber: true, buyerId: true } },
          },
        },
      },
    });

    if (!update) throw new AppError('Production update not found.', 404);

    const updated = await prisma.productionUpdate.update({
      where: { id: updateId },
      data: {
        buyerWarningApproved: approved,
        buyerWarningApprovedBy: approved ? user.userId : null,
        buyerWarningApprovedAt: approved ? new Date() : null,
      },
    });

    // Record audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: approved ? 'APPROVE_BUYER_WARNING' : 'REVOKE_BUYER_WARNING',
        entityType: 'ProductionUpdate',
        entityId: updateId,
        details: {
          orderId: update.orderStage.order.id,
          poNumber: update.orderStage.order.poNumber,
          stageName: update.orderStage.stageName,
          category: update.correctedCategory || update.aiCategory,
          approved,
        },
      },
    });

    return updated;
  }

  /**
   * Get production updates for a stage or order.
   */
  async getUpdates(
    filters: {
      orderStageId?: string;
      orderId?: string;
      supervisorId?: string;
      startDate?: string;
      endDate?: string;
    },
    user?: JwtPayload
  ) {
    const where: Prisma.ProductionUpdateWhereInput = {};

    // Role-based tenant scoping
    if (user?.role === 'SUPERVISOR' && user.productionUnitId) {
      where.orderStage = {
        order: { productionUnitId: user.productionUnitId },
      };
    } else if (user?.role === 'BUYER' && user.buyerId) {
      where.orderStage = {
        order: { buyerId: user.buyerId },
      };
    }

    if (filters.orderStageId) where.orderStageId = filters.orderStageId;
    if (filters.supervisorId) where.supervisorId = filters.supervisorId;
    if (filters.orderId) {
      where.orderStage = {
        ...(where.orderStage as any),
        orderId: filters.orderId,
      };
    }
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) (where.date as Prisma.DateTimeFilter).gte = new Date(filters.startDate);
      if (filters.endDate) (where.date as Prisma.DateTimeFilter).lte = new Date(filters.endDate);
    }

    return prisma.productionUpdate.findMany({
      where,
      include: {
        supervisor: { select: { id: true, name: true } },
        orderStage: {
          select: {
            id: true,
            stageName: true,
            sequence: true,
            order: {
              select: { id: true, poNumber: true },
            },
          },
        },
        photos: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Get timeline of all updates for an order.
   */
  async getOrderTimeline(orderId: string, user?: JwtPayload) {
    const order = await prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        stages: {
          orderBy: { sequence: 'asc' },
          include: {
            productionUpdates: {
              orderBy: { date: 'asc' },
              include: {
                supervisor: { select: { id: true, name: true } },
                photos: true,
              },
            },
          },
        },
      },
    });

    if (!order) throw new AppError('Order not found.', 404);

    // Tenant authorization check
    if (user) {
      if (user.role === 'BUYER' && order.buyerId !== user.buyerId) {
        throw new AppError('Access denied.', 403);
      }
      if (user.role === 'SUPERVISOR' && order.productionUnitId !== user.productionUnitId) {
        throw new AppError('Access denied.', 403);
      }
    }

    return order.stages.map((stage) => ({
      stageId: stage.id,
      stageName: stage.stageName,
      sequence: stage.sequence,
      status: stage.status,
      plannedQuantity: stage.plannedQuantity,
      completedQuantity: stage.completedQuantity,
      plannedStartDate: stage.plannedStartDate,
      plannedEndDate: stage.plannedEndDate,
      actualStartDate: stage.actualStartDate,
      actualEndDate: stage.actualEndDate,
      updates: stage.productionUpdates,
    }));
  }
}

export const productionService = new ProductionService();
