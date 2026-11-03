import prisma from '../lib/prisma';
import { OrderStatus, RiskLevel, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { delayService } from './delay.service';
import type { JwtPayload, PaginationParams, CreateOrderInput } from '../types';

export class OrderService {
  /**
   * List orders with filtering, pagination, and role-based scoping.
   */
  async listOrders(
    user: JwtPayload,
    filters: {
      status?: OrderStatus;
      riskLevel?: RiskLevel;
      buyerId?: string;
      productionUnitId?: string;
      search?: string;
    },
    pagination: PaginationParams
  ) {
    const where: Prisma.ProductionOrderWhereInput = {};

    // Role-based scoping
    if (user.role === 'BUYER' && user.buyerId) {
      where.buyerId = user.buyerId;
    } else if (user.role === 'SUPERVISOR' && user.productionUnitId) {
      where.productionUnitId = user.productionUnitId;
    }

    // Filters
    if (filters.status) where.status = filters.status;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.buyerId && user.role !== 'BUYER') where.buyerId = filters.buyerId;
    if (filters.productionUnitId && user.role !== 'SUPERVISOR') {
      where.productionUnitId = filters.productionUnitId;
    }
    if (filters.search) {
      where.OR = [
        { poNumber: { contains: filters.search, mode: 'insensitive' } },
        { styleName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, country: true } },
          productionUnit: { select: { id: true, name: true, location: true } },
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
            },
          },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.productionOrder.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
        hasNext: pagination.page * pagination.limit < total,
        hasPrev: pagination.page > 1,
      },
    };
  }

  /**
   * Get a single order by ID with full details and delay analysis.
   */
  async getOrder(orderId: string, user: JwtPayload) {
    const order = await prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        productionUnit: true,
        stages: {
          orderBy: { sequence: 'asc' },
          include: {
            productionUpdates: {
              orderBy: { date: 'desc' },
              take: 10,
              include: {
                supervisor: { select: { id: true, name: true } },
              },
            },
          },
        },
        photos: { orderBy: { createdAt: 'desc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    // Role-based access check
    if (user.role === 'BUYER' && order.buyerId !== user.buyerId) {
      throw new AppError('Access denied.', 403);
    }
    if (user.role === 'SUPERVISOR' && order.productionUnitId !== user.productionUnitId) {
      throw new AppError('Access denied.', 403);
    }

    // Attach delay analysis
    const delayAnalysis = await delayService.analyseOrder(orderId);

    return { ...order, delayAnalysis };
  }

  /**
   * Create a new production order.
   */
  async createOrder(input: CreateOrderInput, userId: string) {
    // Verify buyer exists
    const buyer = await prisma.buyer.findUnique({ where: { id: input.buyerId } });
    if (!buyer) throw new AppError('Buyer not found.', 404);

    // Verify production unit exists
    const unit = await prisma.productionUnit.findUnique({ where: { id: input.productionUnitId } });
    if (!unit) throw new AppError('Production unit not found.', 404);

    // Check PO number uniqueness
    const existing = await prisma.productionOrder.findUnique({ where: { poNumber: input.poNumber } });
    if (existing) throw new AppError(`PO number "${input.poNumber}" already exists.`, 409);

    const order = await prisma.productionOrder.create({
      data: {
        poNumber: input.poNumber,
        buyerId: input.buyerId,
        styleName: input.styleName,
        description: input.description,
        colour: input.colour,
        sizes: input.sizes as Prisma.InputJsonValue,
        totalQuantity: input.totalQuantity,
        productionUnitId: input.productionUnitId,
        exFactoryDate: new Date(input.exFactoryDate),
        createdById: userId,
        stages: {
          create: input.stages.map((s) => ({
            stageName: s.stageName,
            sequence: s.sequence,
            plannedStartDate: new Date(s.plannedStartDate),
            plannedEndDate: new Date(s.plannedEndDate),
            plannedQuantity: s.plannedQuantity,
          })),
        },
      },
      include: {
        buyer: true,
        productionUnit: true,
        stages: { orderBy: { sequence: 'asc' } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_ORDER',
        entityType: 'ProductionOrder',
        entityId: order.id,
        details: { poNumber: order.poNumber },
      },
    });

    return order;
  }

  /**
   * Update an existing order.
   */
  async updateOrder(
    orderId: string,
    input: Partial<Pick<CreateOrderInput, 'styleName' | 'description' | 'colour' | 'sizes' | 'totalQuantity' | 'exFactoryDate'>> & { status?: OrderStatus },
    userId: string
  ) {
    const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Order not found.', 404);

    const updateData: Prisma.ProductionOrderUpdateInput = {};
    if (input.styleName !== undefined) updateData.styleName = input.styleName;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.colour !== undefined) updateData.colour = input.colour;
    if (input.sizes !== undefined) updateData.sizes = input.sizes as Prisma.InputJsonValue;
    if (input.totalQuantity !== undefined) updateData.totalQuantity = input.totalQuantity;
    if (input.exFactoryDate !== undefined) updateData.exFactoryDate = new Date(input.exFactoryDate);
    if (input.status !== undefined) updateData.status = input.status;

    const updated = await prisma.productionOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        buyer: true,
        productionUnit: true,
        stages: { orderBy: { sequence: 'asc' } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_ORDER',
        entityType: 'ProductionOrder',
        entityId: order.id,
        details: { changes: input },
      },
    });

    return updated;
  }

  /**
   * Delete an order (soft delete — set status to CANCELLED).
   */
  async deleteOrder(orderId: string, userId: string) {
    const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Order not found.', 404);

    const updated = await prisma.productionOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CANCEL_ORDER',
        entityType: 'ProductionOrder',
        entityId: orderId,
      },
    });

    return updated;
  }

  /**
   * Get list of buyers.
   */
  async getBuyers() {
    return prisma.buyer.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * Get list of production units.
   */
  async getProductionUnits() {
    return prisma.productionUnit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

export const orderService = new OrderService();
