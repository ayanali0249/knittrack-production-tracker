/**
 * Order API Tests
 *
 * Tests order CRUD operations with RBAC enforcement.
 * Uses mocked Prisma client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// Mock Prisma
vi.mock('../lib/prisma', () => {
  return {
    default: {
      productionOrder: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      orderStage: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      buyer: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      productionUnit: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    },
  };
});

// Mock delay service
vi.mock('../services/delay.service', () => ({
  delayService: {
    analyseOrder: vi.fn().mockResolvedValue({
      orderId: 'order-1',
      poNumber: 'B-PO-88213',
      overallRiskLevel: 'ON_TRACK',
      stages: [],
      summary: 'Test summary',
      currentStage: null,
      projectedOrderDelay: 0,
    }),
    recalculateOrderRisk: vi.fn().mockResolvedValue('ON_TRACK'),
  },
}));

import prisma from '../lib/prisma';
import orderRoutes from '../routes/orders';
import { errorHandler } from '../middleware/errorHandler';
import { config } from '../config';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/orders', orderRoutes);
  app.use(errorHandler);
  return app;
}

function generateToken(role: string, extra: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      userId: 'user-1',
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

const mockOrder = {
  id: 'order-1',
  poNumber: 'B-PO-88213',
  buyerId: 'buyer-1',
  buyer: { id: 'buyer-1', name: 'Company B', country: 'UK' },
  styleName: "Men's crew neck tee, navy",
  description: 'Classic crew neck t-shirt',
  colour: 'Navy',
  sizes: { S: 2000, M: 3500, L: 4000, XL: 2500 },
  totalQuantity: 12000,
  productionUnitId: 'unit-1',
  productionUnit: { id: 'unit-1', name: 'Unit A - Colombo', location: 'Colombo, Sri Lanka' },
  exFactoryDate: new Date('2026-11-20'),
  status: 'ACTIVE',
  riskLevel: 'ON_TRACK',
  createdById: 'user-1',
  createdBy: { id: 'user-1', name: 'Priya Perera', email: 'merch@knittrack.com' },
  stages: [
    {
      id: 'stg-1',
      stageName: 'Cutting',
      sequence: 1,
      status: 'COMPLETED',
      plannedQuantity: 12000,
      completedQuantity: 12000,
      plannedStartDate: new Date('2026-10-01'),
      plannedEndDate: new Date('2026-10-08'),
      actualStartDate: new Date('2026-10-01'),
      actualEndDate: new Date('2026-10-07'),
    },
  ],
  photos: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Order API', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  // ── RBAC Tests ──────────────────────────────────

  describe('RBAC enforcement', () => {
    it('should deny unauthenticated access', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });

    it('should allow ADMIN to list orders', async () => {
      (prisma.productionOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.productionOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const token = generateToken('ADMIN');
      const res = await request(app)
        .get('/api/orders')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
    });

    it('should allow MERCHANDISER to list orders', async () => {
      (prisma.productionOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.productionOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .get('/api/orders')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
    });

    it('should allow SUPERVISOR to list orders (scoped to their unit)', async () => {
      (prisma.productionOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.productionOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const token = generateToken('SUPERVISOR', { productionUnitId: 'unit-1' });
      const res = await request(app)
        .get('/api/orders')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
    });

    it('should allow BUYER to list orders (scoped to their buyer)', async () => {
      (prisma.productionOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.productionOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const token = generateToken('BUYER', { buyerId: 'buyer-1' });
      const res = await request(app)
        .get('/api/orders')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
    });

    it('should deny BUYER from creating orders', async () => {
      const token = generateToken('BUYER', { buyerId: 'buyer-1' });
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send({
          poNumber: 'TEST-001',
          buyerId: 'buyer-1',
          styleName: 'Test',
          colour: 'Blue',
          sizes: { M: 100 },
          totalQuantity: 100,
          productionUnitId: 'unit-1',
          exFactoryDate: '2026-12-01',
          stages: [{ stageName: 'Cutting', sequence: 1, plannedStartDate: '2026-11-01', plannedEndDate: '2026-11-10', plannedQuantity: 100 }],
        });

      expect(res.status).toBe(403);
    });

    it('should deny SUPERVISOR from creating orders', async () => {
      const token = generateToken('SUPERVISOR', { productionUnitId: 'unit-1' });
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send({
          poNumber: 'TEST-001',
          buyerId: 'buyer-1',
          styleName: 'Test',
          colour: 'Blue',
          sizes: { M: 100 },
          totalQuantity: 100,
          productionUnitId: 'unit-1',
          exFactoryDate: '2026-12-01',
          stages: [{ stageName: 'Cutting', sequence: 1, plannedStartDate: '2026-11-01', plannedEndDate: '2026-11-10', plannedQuantity: 100 }],
        });

      expect(res.status).toBe(403);
    });

    it('should deny non-ADMIN from deleting orders', async () => {
      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .delete('/api/orders/order-1')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(403);
    });
  });

  // ── List Orders ─────────────────────────────────

  describe('GET /api/orders', () => {
    it('should return paginated orders', async () => {
      (prisma.productionOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockOrder]);
      (prisma.productionOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const token = generateToken('ADMIN');
      const res = await request(app)
        .get('/api/orders?page=1&limit=10')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.pagination.page).toBe(1);
    });

    it('should filter by status', async () => {
      (prisma.productionOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.productionOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const token = generateToken('ADMIN');
      const res = await request(app)
        .get('/api/orders?status=ACTIVE')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
    });
  });

  // ── Get Order ───────────────────────────────────

  describe('GET /api/orders/:id', () => {
    it('should return order with delay analysis', async () => {
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        stages: [{
          ...mockOrder.stages[0],
          productionUpdates: [],
        }],
      });

      const token = generateToken('ADMIN');
      const res = await request(app)
        .get('/api/orders/order-1')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.poNumber).toBe('B-PO-88213');
      expect(res.body.data.delayAnalysis).toBeDefined();
    });

    it('should return 404 for non-existent order', async () => {
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const token = generateToken('ADMIN');
      const res = await request(app)
        .get('/api/orders/nonexistent')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(404);
    });

    it('should deny BUYER access to other buyer orders', async () => {
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOrder,
        buyerId: 'buyer-2', // Different buyer
        stages: [{
          ...mockOrder.stages[0],
          productionUpdates: [],
        }],
      });

      const token = generateToken('BUYER', { buyerId: 'buyer-1' });
      const res = await request(app)
        .get('/api/orders/order-1')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(403);
    });
  });

  // ── Create Order ────────────────────────────────

  describe('POST /api/orders', () => {
    const validOrderInput = {
      poNumber: 'NEW-001',
      buyerId: 'buyer-1',
      styleName: "Men's basic tee",
      colour: 'Black',
      sizes: { S: 500, M: 1000, L: 1000, XL: 500 },
      totalQuantity: 3000,
      productionUnitId: 'unit-1',
      exFactoryDate: '2026-12-15',
      stages: [
        {
          stageName: 'Cutting',
          sequence: 1,
          plannedStartDate: '2026-11-15',
          plannedEndDate: '2026-11-20',
          plannedQuantity: 3000,
        },
        {
          stageName: 'Stitching',
          sequence: 2,
          plannedStartDate: '2026-11-20',
          plannedEndDate: '2026-12-01',
          plannedQuantity: 3000,
        },
      ],
    };

    it('should create an order successfully (MERCHANDISER)', async () => {
      (prisma.buyer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'buyer-1', name: 'Test' });
      (prisma.productionUnit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'unit-1', name: 'Unit A' });
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null); // No duplicate
      (prisma.productionOrder.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'new-order',
        ...validOrderInput,
        stages: [],
      });
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send(validOrderInput);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject duplicate PO number', async () => {
      (prisma.buyer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'buyer-1' });
      (prisma.productionUnit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'unit-1' });
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'existing' });

      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send(validOrderInput);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('should reject order with invalid buyer', async () => {
      (prisma.buyer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send(validOrderInput);

      expect(res.status).toBe(404);
    });

    it('should reject order with missing required fields', async () => {
      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send({ poNumber: 'TEST' }); // Missing fields

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject order with no stages', async () => {
      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send({ ...validOrderInput, stages: [] });

      expect(res.status).toBe(400);
    });
  });

  // ── Get Buyers/Production Units ─────────────────

  describe('GET /api/orders/buyers', () => {
    it('should return list of buyers for authorized roles', async () => {
      (prisma.buyer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'b1', name: 'Company B', country: 'UK' },
      ]);

      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .get('/api/orders/buyers')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/orders/production-units', () => {
    it('should return list of production units', async () => {
      (prisma.productionUnit.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'u1', name: 'Unit A', location: 'Colombo' },
      ]);

      const token = generateToken('ADMIN');
      const res = await request(app)
        .get('/api/orders/production-units')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
