import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  default: {
    productionOrder: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    orderStage: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    productionUpdate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    buyer: {
      findUnique: vi.fn(),
    },
    buyerAccessToken: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock delay service
vi.mock('../services/delay.service', () => ({
  delayService: {
    analyseOrder: vi.fn().mockResolvedValue({
      orderId: 'order-1',
      poNumber: 'B-PO-88213',
      overallRiskLevel: 'ON_TRACK',
      stages: [],
      projectedOrderDelay: 0,
    }),
    recalculateAllOrders: vi.fn().mockResolvedValue({ updated: 1, results: [] }),
  },
}));

// Mock Gemini AI API call
vi.mock('../services/ai.service', () => ({
  aiService: {
    batchClassify: vi.fn().mockResolvedValue({ totalProcessed: 0, classified: 0, errors: 0, results: [] }),
    classifyNote: vi.fn().mockResolvedValue({ category: 'Other', confidence: 0.9, explanation: 'Test' }),
  },
}));

import prisma from '../lib/prisma';
import orderRoutes from '../routes/orders';
import productionRoutes from '../routes/production';
import buyerRoutes from '../routes/buyer';
import dashboardRoutes from '../routes/dashboard';
import aiRoutes from '../routes/ai';
import authRoutes from '../routes/auth';
import { errorHandler } from '../middleware/errorHandler';
import { config } from '../config';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/production', productionRoutes);
  app.use('/api/buyer', buyerRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/ai', aiRoutes);
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

describe('RBAC and Tenant Data Isolation Audit', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  describe('Cross-Role Privilege Boundaries (RBAC)', () => {
    it('denies MERCHANDISER from submitting floor production updates (POST /api/production/updates)', async () => {
      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .post('/api/production/updates')
        .set('Cookie', [`token=${token}`])
        .send({ orderStageId: 'stage-1', quantity: 100, date: '2026-11-04' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
      expect(res.body.error).toContain('MERCHANDISER');
    });

    it('denies SUPERVISOR from creating new production orders (POST /api/orders)', async () => {
      const token = generateToken('SUPERVISOR', { productionUnitId: 'unit-1' });
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send({ poNumber: 'TEST-PO' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('denies BUYER from creating new production orders (POST /api/orders)', async () => {
      const token = generateToken('BUYER', { buyerId: 'buyer-1' });
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`token=${token}`])
        .send({ poNumber: 'TEST-PO' });

      expect(res.status).toBe(403);
    });

    it('denies MERCHANDISER from deleting production orders (DELETE /api/orders/:id)', async () => {
      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .delete('/api/orders/order-1')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('ADMIN');
    });

    it('denies MERCHANDISER and SUPERVISOR from triggering global recalculate (POST /api/dashboard/recalculate)', async () => {
      const merchToken = generateToken('MERCHANDISER');
      const res1 = await request(app)
        .post('/api/dashboard/recalculate')
        .set('Cookie', [`token=${merchToken}`]);
      expect(res1.status).toBe(403);

      const superToken = generateToken('SUPERVISOR', { productionUnitId: 'unit-1' });
      const res2 = await request(app)
        .post('/api/dashboard/recalculate')
        .set('Cookie', [`token=${superToken}`]);
      expect(res2.status).toBe(403);
    });

    it('denies MERCHANDISER from triggering batch AI classification (POST /api/ai/batch-classify)', async () => {
      const token = generateToken('MERCHANDISER');
      const res = await request(app)
        .post('/api/ai/batch-classify')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(403);
    });

    it('denies MERCHANDISER and SUPERVISOR from accessing Buyer Portal API without buyerId', async () => {
      const merchToken = generateToken('MERCHANDISER');
      const res = await request(app)
        .get('/api/buyer/portal')
        .set('Cookie', [`token=${merchToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Buyer role required');
    });
  });

  describe('Buyer Tenant Isolation (Cross-Tenant Data Protection)', () => {
    it('denies Buyer B from reading Buyer C order detail via GET /api/orders/:id', async () => {
      // Mock order belonging to Buyer C
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'order-buyer-c',
        buyerId: 'buyer-c-id',
        productionUnitId: 'unit-1',
        poNumber: 'C-PO-0488',
        stages: [],
      });

      // Token for Buyer B
      const buyerBToken = generateToken('BUYER', { buyerId: 'buyer-b-id' });
      const res = await request(app)
        .get('/api/orders/order-buyer-c')
        .set('Cookie', [`token=${buyerBToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied.');
    });

    it('denies Buyer B from reading Buyer C timeline via GET /api/production/timeline/:id', async () => {
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'order-buyer-c',
        buyerId: 'buyer-c-id',
        productionUnitId: 'unit-1',
        stages: [],
      });

      const buyerBToken = generateToken('BUYER', { buyerId: 'buyer-b-id' });
      const res = await request(app)
        .get('/api/production/timeline/order-buyer-c')
        .set('Cookie', [`token=${buyerBToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied.');
    });

    it('denies Buyer B from accessing Buyer C delay analysis via GET /api/dashboard/delay/:id', async () => {
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'order-buyer-c',
        buyerId: 'buyer-c-id',
        productionUnitId: 'unit-1',
      });

      const buyerBToken = generateToken('BUYER', { buyerId: 'buyer-b-id' });
      const res = await request(app)
        .get('/api/dashboard/delay/order-buyer-c')
        .set('Cookie', [`token=${buyerBToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied.');
    });
  });

  describe('Supervisor Production Unit Isolation', () => {
    it('denies Supervisor Unit 1 from submitting update to Unit 2 stage (POST /api/production/updates)', async () => {
      (prisma.orderStage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'stage-unit-2',
        order: {
          id: 'order-2',
          productionUnitId: 'unit-2-id',
          status: 'ACTIVE',
        },
      });

      const sup1Token = generateToken('SUPERVISOR', { productionUnitId: 'unit-1-id' });
      const res = await request(app)
        .post('/api/production/updates')
        .set('Cookie', [`token=${sup1Token}`])
        .send({ orderStageId: 'stage-unit-2', quantity: 500, date: '2026-11-04' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('You can only submit updates for your assigned production unit');
    });

    it('denies Supervisor Unit 1 from viewing Unit 2 timeline (GET /api/production/timeline/:id)', async () => {
      (prisma.productionOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'order-unit-2',
        productionUnitId: 'unit-2-id',
        stages: [],
      });

      const sup1Token = generateToken('SUPERVISOR', { productionUnitId: 'unit-1-id' });
      const res = await request(app)
        .get('/api/production/timeline/order-unit-2')
        .set('Cookie', [`token=${sup1Token}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied.');
    });
  });

  describe('Session Invalidation and Logout', () => {
    it('clears token cookie on POST /api/auth/logout and rejects subsequent unauthenticated calls', async () => {
      const logoutRes = await request(app).post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.headers['set-cookie']).toBeDefined();
      expect(logoutRes.headers['set-cookie'][0]).toContain('token=;');

      // Request without token must be rejected with 401
      const meRes = await request(app).get('/api/auth/me');
      expect(meRes.status).toBe(401);
      expect(meRes.body.error).toContain('Authentication required');
    });
  });
});
