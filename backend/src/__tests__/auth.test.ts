/**
 * Auth API Tests
 *
 * Tests login, logout, and /me endpoints with various scenarios.
 * Uses a mocked Prisma client to avoid database dependency.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock Prisma
vi.mock('../lib/prisma', () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

import prisma from '../lib/prisma';
import authRoutes from '../routes/auth';
import { errorHandler } from '../middleware/errorHandler';
import { config } from '../config';

// Test app setup
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

const mockUser = {
  id: 'user-1',
  email: 'admin@knittrack.com',
  name: 'Admin User',
  password: bcrypt.hashSync('admin123', 10),
  role: 'ADMIN' as const,
  productionUnitId: null,
  buyerId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Auth API', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  // ── Login Tests ─────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@knittrack.com', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@knittrack.com');
      expect(res.body.data.user.role).toBe('ADMIN');
      // Should set HttpOnly cookie
      expect(res.headers['set-cookie']).toBeDefined();
      const cookie = res.headers['set-cookie']![0];
      expect(cookie).toContain('token=');
      expect(cookie).toContain('HttpOnly');
    });

    it('should reject invalid password', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@knittrack.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@knittrack.com', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject deactivated user', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@knittrack.com', password: 'admin123' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('deactivated');
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'admin123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@knittrack.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'admin123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  // ── Logout Tests ────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should clear the token cookie', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Should clear the cookie
      expect(res.headers['set-cookie']).toBeDefined();
      const cookie = res.headers['set-cookie']![0];
      expect(cookie).toContain('token=;');
    });
  });

  // ── Me Tests ────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const userProfile = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        isActive: true,
        productionUnitId: null,
        productionUnit: null,
        buyerId: null,
        buyer: null,
        createdAt: mockUser.createdAt,
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(userProfile);

      // Generate a valid token
      const token = jwt.sign(
        {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          productionUnitId: null,
          buyerId: null,
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@knittrack.com');
    });

    it('should reject request without authentication', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        config.jwt.secret,
        { expiresIn: '0s' }
      );

      // Wait a moment for the token to expire
      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${token}`]);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('expired');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['token=invalid-token-string']);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });
  });
});
