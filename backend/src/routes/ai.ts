import { Router } from 'express';
import { z } from 'zod';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { AI_CATEGORIES } from '../lib/constants';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// Validation schemas
const classifySchema = z.object({
  note: z.string().min(1, 'Note text is required'),
});

const correctSchema = z.object({
  category: z.enum(AI_CATEGORIES as unknown as [string, ...string[]]),
});

// POST /api/ai/classify — classify a note (ad-hoc)
router.post(
  '/classify',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR'),
  validate(classifySchema),
  asyncHandler(async (req, res) => aiController.classify(req, res))
);

// POST /api/ai/classify/:updateId — classify and save to a production update
router.post(
  '/classify/:updateId',
  requireRole('ADMIN', 'MERCHANDISER'),
  asyncHandler(async (req, res) => aiController.classifyUpdate(req, res))
);

// PUT /api/ai/correct/:updateId — correct AI classification
router.put(
  '/correct/:updateId',
  requireRole('ADMIN', 'MERCHANDISER'),
  validate(correctSchema),
  asyncHandler(async (req, res) => aiController.correctClassification(req, res))
);

// POST /api/ai/batch-classify — batch classify all unclassified notes
router.post(
  '/batch-classify',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => aiController.batchClassify(req, res))
);

export default router;
