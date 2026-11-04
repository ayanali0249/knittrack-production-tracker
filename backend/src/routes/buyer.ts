import { Router } from 'express';
import { z } from 'zod';
import { buyerController } from '../controllers/buyer.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const generateTokenSchema = z.object({
  buyerId: z.string().min(1, 'Buyer ID is required'),
  expiresInHours: z.number().int().positive().max(720).optional().default(72),
});

// POST /api/buyer/token — generate buyer access token (admin/merchandiser)
router.post(
  '/token',
  authenticate,
  requireRole('ADMIN', 'MERCHANDISER'),
  validate(generateTokenSchema),
  asyncHandler(async (req, res) => buyerController.generateToken(req, res))
);

// Middleware that supports both query token (?token=xxx) and standard JWT cookie auth
const buyerAuth = (req: any, res: any, next: any) => {
  if (req.query.token) {
    return next();
  }
  return authenticate(req, res, next);
};

// GET /api/buyer/portal — buyer portal data
router.get(
  '/portal',
  buyerAuth,
  asyncHandler(async (req, res) => buyerController.getPortalData(req, res))
);

// GET /api/buyer/portal/:orderId — buyer portal order detail
router.get(
  '/portal/:orderId',
  buyerAuth,
  asyncHandler(async (req, res) => buyerController.getOrderDetail(req, res))
);

// GET /api/buyer/orders — alias for portal orders list
router.get(
  '/orders',
  buyerAuth,
  asyncHandler(async (req, res) => buyerController.getPortalData(req, res))
);

// GET /api/buyer/orders/:orderId — alias for portal order detail
router.get(
  '/orders/:orderId',
  buyerAuth,
  asyncHandler(async (req, res) => buyerController.getOrderDetail(req, res))
);

export default router;
