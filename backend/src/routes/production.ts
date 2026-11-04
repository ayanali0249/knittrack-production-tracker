import { Router } from 'express';
import { z } from 'zod';
import { productionController } from '../controllers/production.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All production routes require authentication
router.use(authenticate);

// Validation schemas
const submitUpdateSchema = z.object({
  orderStageId: z.string().min(1, 'Stage ID is required'),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date format').default(() => new Date().toISOString().split('T')[0]),
  quantity: z.coerce.number().int().min(0, 'Quantity must be non-negative'),
  note: z.string().optional(),
  clientRequestId: z.string().optional(),
});

const approveWarningSchema = z.object({
  approved: z.boolean().default(true),
});

const editUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(0).optional(),
  note: z.string().optional(),
}).refine((data) => data.quantity !== undefined || data.note !== undefined, {
  message: 'At least one field (quantity or note) must be provided',
});

// POST /api/production/updates
router.post(
  '/updates',
  requireRole('ADMIN', 'SUPERVISOR'),
  upload.single('photo'),
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

// PUT /api/production/updates/:id/approve-warning (Merchandiser/Admin approves buyer warning)
router.put(
  '/updates/:id/approve-warning',
  requireRole('ADMIN', 'MERCHANDISER'),
  validate(approveWarningSchema),
  asyncHandler(async (req, res) => productionController.approveWarning(req, res))
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
