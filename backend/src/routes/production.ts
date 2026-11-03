import { Router } from 'express';
import { z } from 'zod';
import { productionController } from '../controllers/production.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All production routes require authentication
router.use(authenticate);

// Validation schemas
const submitUpdateSchema = z.object({
  orderStageId: z.string().min(1, 'Stage ID is required'),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date format'),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  note: z.string().optional(),
});

const editUpdateSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  note: z.string().optional(),
}).refine((data) => data.quantity !== undefined || data.note !== undefined, {
  message: 'At least one field (quantity or note) must be provided',
});

// POST /api/production/updates
router.post(
  '/updates',
  requireRole('ADMIN', 'SUPERVISOR'),
  validate(submitUpdateSchema),
  asyncHandler(async (req, res) => productionController.submitUpdate(req, res))
);

// PUT /api/production/updates/:id
router.put(
  '/updates/:id',
  requireRole('ADMIN', 'SUPERVISOR'),
  validate(editUpdateSchema),
  asyncHandler(async (req, res) => productionController.editUpdate(req, res))
);

// GET /api/production/updates
router.get(
  '/updates',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR'),
  asyncHandler(async (req, res) => productionController.getUpdates(req, res))
);

// GET /api/production/timeline/:orderId
router.get(
  '/timeline/:orderId',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR', 'BUYER'),
  asyncHandler(async (req, res) => productionController.getTimeline(req, res))
);

export default router;
