import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard/summary
router.get(
  '/summary',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR', 'BUYER'),
  asyncHandler(async (req, res) => dashboardController.getSummary(req, res))
);

// GET /api/dashboard/delay-overview
router.get(
  '/delay-overview',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR', 'BUYER'),
  asyncHandler(async (req, res) => dashboardController.getDelayOverview(req, res))
);

// GET /api/dashboard/efficiency
router.get(
  '/efficiency',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR'),
  asyncHandler(async (req, res) => dashboardController.getEfficiency(req, res))
);

// GET /api/dashboard/delay/:orderId
router.get(
  '/delay/:orderId',
  requireRole('ADMIN', 'MERCHANDISER', 'SUPERVISOR', 'BUYER'),
  asyncHandler(async (req, res) => dashboardController.getOrderDelay(req, res))
);

// POST /api/dashboard/recalculate
router.post(
  '/recalculate',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => dashboardController.recalculate(req, res))
);

export default router;
