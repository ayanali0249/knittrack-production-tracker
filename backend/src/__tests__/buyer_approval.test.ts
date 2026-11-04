import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import productionRoutes from '../routes/production';
import buyerRoutes from '../routes/buyer';
import { errorHandler } from '../middleware/errorHandler';
import { config } from '../config';

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  default: {
    productionOrder: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    orderStage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    productionUpdate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    buyer: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb({
      productionUpdate: {
        create: vi.fn().mockResolvedValue({
          id: 'new-update-1',
          orderStageId: 'stage-1',
          quantity: 200,
          clientRequestId: 'req-uuid-1',
        }),
      },
      orderStage: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    })),
  },
}));

// Mock delay service
vi.mock('../services/delay.service', () => ({
  delayService: {
    analyseOrder: vi.fn().mockResolvedValue({
      orderId: 'order-b-1',
      poNumber: 'B-PO-88213',
      overallRiskLevel: 'ON_TRACK',
      stages: [],
      projectedOrderDelay: 0,
    }),
    recalculateOrderRisk: vi.fn().mockResolvedValue(undefined),
  },
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/production', productionRoutes);
  app.use('/api/buyer', buyerRoutes);
  app.use(errorHandler);
  return app;
}

function generateToken(role: string, extra: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      userId: `user-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@knittrack.com`,
      role,
      productionUnitId: null,
      buyerId: null,
      ...extra,
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

describe('Buyer Warning Approval & Idempotency Workflow', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  describe('Buyer Warning Approval Authorization', () => {
    it('allows MERCHANDISER to approve a buyer-facing warning', async () => {
      const token = generateToken('MERCHANDISER');
      (prisma.productionUpdate.findUnique as any).mockResolvedValue({
        id: 'update-1',
        orderStage: {
          stageName: 'Stitching',
          order: { id: 'order-1', poNumber: 'B-PO-88213', buyerId: 'buyer-b' },
        },
        aiCategory: 'Machine breakdown',
        correctedCategory: null,
      });

      (prisma.productionUpdate.update as any).mockResolvedValue({
        id: 'update-1',
        buyerWarningApproved: true,
        buyerWarningApprovedBy: 'user-merchandiser',
        buyerWarningApprovedAt: new Date(),
      });

      const res = await request(app)
        .put('/api/production/updates/update-1/approve-warning')
        .set('Cookie', [`token=${token}`])
        .send({ approved: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.buyerWarningApproved).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'APPROVE_BUYER_WARNING',
            entityId: 'update-1',
          }),
        })
      );
    });

    it('allows MERCHANDISER to revoke buyer visibility', async () => {
      const token = generateToken('MERCHANDISER');
      (prisma.productionUpdate.findUnique as any).mockResolvedValue({
        id: 'update-1',
        orderStage: {
          stageName: 'Stitching',
          order: { id: 'order-1', poNumber: 'B-PO-88213', buyerId: 'buyer-b' },
        },
      });

      (prisma.productionUpdate.update as any).mockResolvedValue({
        id: 'update-1',
        buyerWarningApproved: false,
        buyerWarningApprovedBy: null,
        buyerWarningApprovedAt: null,
      });

      const res = await request(app)
        .put('/api/production/updates/update-1/approve-warning')
        .set('Cookie', [`token=${token}`])
        .send({ approved: false });

      expect(res.status).toBe(200);
      expect(res.body.data.buyerWarningApproved).toBe(false);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'REVOKE_BUYER_WARNING',
          }),
        })
      );
    });

    it('denies SUPERVISOR and BUYER from approving warnings (403)', async () => {
      const supToken = generateToken('SUPERVISOR', { productionUnitId: 'unit-1' });
      const supRes = await request(app)
        .put('/api/production/updates/update-1/approve-warning')
        .set('Cookie', [`token=${supToken}`])
        .send({ approved: true });

      expect(supRes.status).toBe(403);

      const buyerToken = generateToken('BUYER', { buyerId: 'buyer-b' });
      const buyerRes = await request(app)
        .put('/api/production/updates/update-1/approve-warning')
        .set('Cookie', [`token=${buyerToken}`])
        .send({ approved: true });

      expect(buyerRes.status).toBe(403);
    });
  });

  describe('Buyer Visibility Filtering (Approved vs Unapproved)', () => {
    it('filters out unapproved warning notes when Buyer queries order detail', async () => {
      const buyerToken = generateToken('BUYER', { buyerId: 'buyer-b' });

      // Mock DB return for buyer query: Prisma query filter where: { buyerWarningApproved: true }
      (prisma.productionOrder.findFirst as any).mockImplementation(({ where, include }: any) => {
        expect(where.buyerId).toBe('buyer-b');
        expect(include.stages.include.productionUpdates.where).toEqual({ buyerWarningApproved: true });

        return Promise.resolve({
          id: 'order-b-1',
          poNumber: 'B-PO-88213',
          buyerId: 'buyer-b',
          totalQuantity: 12000,
          stages: [
            {
              id: 'stage-1',
              stageName: 'Stitching',
              productionUpdates: [
                {
                  id: 'upd-approved-1',
                  date: new Date('2026-10-22'),
                  quantity: 500,
                  aiCategory: 'Machine breakdown',
                  buyerWarningApproved: true,
                },
                // Note: unapproved update would be excluded by the database query where clause
              ],
            },
          ],
          photos: [],
        });
      });

      const res = await request(app)
        .get('/api/buyer/portal/order-b-1')
        .set('Cookie', [`token=${buyerToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.stages[0].productionUpdates).toHaveLength(1);
      expect(res.body.data.stages[0].productionUpdates[0].buyerWarningApproved).toBe(true);
    });

    it('blocks Buyer from accessing another tenant orders or warning logs (404)', async () => {
      const buyerBToken = generateToken('BUYER', { buyerId: 'buyer-b' });

      (prisma.productionOrder.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/buyer/portal/order-c-1')
        .set('Cookie', [`token=${buyerBToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Order not found or access denied');
    });

    it('blocks Buyer from modifying or submitting production updates (403)', async () => {
      const buyerToken = generateToken('BUYER', { buyerId: 'buyer-b' });

      const res = await request(app)
        .post('/api/production/updates')
        .set('Cookie', [`token=${buyerToken}`])
        .send({ orderStageId: 'stage-1', quantity: 100, date: '2026-11-04' });

      expect(res.status).toBe(403);
    });
  });

  describe('Offline-First Idempotency (clientRequestId Deduplication)', () => {
    it('returns existing record idempotently when same clientRequestId is resubmitted', async () => {
      const supToken = generateToken('SUPERVISOR', { productionUnitId: 'unit-1' });

      (prisma.orderStage.findUnique as any).mockResolvedValue({
        id: 'stage-1',
        plannedQuantity: 5000,
        completedQuantity: 2000,
        order: { id: 'order-1', poNumber: 'B-PO-88213', productionUnitId: 'unit-1', status: 'ACTIVE' },
      });

      // Existing update with clientRequestId 'offline-req-uuid-999'
      const existingRecord = {
        id: 'update-existing-999',
        orderStageId: 'stage-1',
        supervisorId: 'user-supervisor',
        quantity: 350,
        date: new Date('2026-11-04'),
        clientRequestId: 'offline-req-uuid-999',
        supervisor: { id: 'user-supervisor', name: 'K. Murugan' },
        orderStage: { id: 'stage-1', stageName: 'Stitching' },
      };

      (prisma.productionUpdate.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.clientRequestId === 'offline-req-uuid-999') {
          return Promise.resolve(existingRecord);
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/production/updates')
        .set('Cookie', [`token=${supToken}`])
        .send({
          orderStageId: 'stage-1',
          quantity: 350,
          date: '2026-11-04',
          clientRequestId: 'offline-req-uuid-999',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('update-existing-999');
      expect(res.body.data.clientRequestId).toBe('offline-req-uuid-999');
      // Notice: $transaction was NOT called because idempotent hit returned immediately!
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
