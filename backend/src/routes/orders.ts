import { Router } from 'express';
import { z } from 'zod';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// Validation schemas
const createOrderSchema = z.object({
  poNumber: z.string().min(1, 'PO number is required'),
  buyerId: z.string().min(1, 'Buyer ID is required'),
  styleName: z.string().min(1, 'Style name is required'),
  description: z.string().optional(),
  colour: z.string().min(1, 'Colour is required'),
  sizes: z.record(z.string(), z.number().int().positive()),
  totalQuantity: z.number().int().positive('Total quantity must be positive'),
  productionUnitId: z.string().min(1, 'Production unit ID is required'),
  exFactoryDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date format'),
  stages: z.array(
    z.object({
      stageName: z.string().min(1),
      sequence: z.number().int().positive(),
      plannedStartDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
      plannedEndDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
      plannedQuantity: z.number().int().positive(),
    })
  ).min(1, 'At least one stage is required'),
});

const updateOrderSchema = z.object({
  styleName: z.string().min(1).optional(),
  description: z.string().optional(),
  colour: z.string().min(1).optional(),
  sizes: z.record(z.string(), z.number().int().positive()).optional(),
  totalQuantity: z.number().int().positive().optional(),
  exFactoryDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date').optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
});

// GET /api/orders/buyers — must be before /:id route
router.get(
  '/buyers',
  requireRole('ADMIN', 'MERCHANDISER'),
  asyncHandler(async (req, res) => orderController.getBuyers(req, res))
);

// GET /api/orders/production-units
router.get(
  '/production-units',
  requireRole('ADMIN', 'MERCHANDISER'),
  asyncHandler(async (req, res) => orderController.getProductionUnits(req, res))
);

// GET /api/orders
router.get(
  '/',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR', 'BUYER'),
  asyncHandler(async (req, res) => orderController.list(req, res))
);

// GET /api/orders/:id
router.get(
  '/:id',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR', 'BUYER'),
  asyncHandler(async (req, res) => orderController.getById(req, res))
);

// POST /api/orders
router.post(
  '/',
  requireRole('ADMIN', 'MERCHANDISER'),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => orderController.create(req, res))
);

// PUT /api/orders/:id
router.put(
  '/:id',
  requireRole('ADMIN', 'MERCHANDISER'),
  validate(updateOrderSchema),
  asyncHandler(async (req, res) => orderController.update(req, res))
);

// DELETE /api/orders/:id
router.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => orderController.remove(req, res))
);

export default router;
