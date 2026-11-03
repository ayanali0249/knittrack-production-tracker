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

// GET /api/buyer/portal — buyer portal data
// Supports both JWT auth (buyer user) and token-based access (?token=xxx)
router.get(
  '/portal',
  asyncHandler(async (req, res) => {
    // If token is in query, skip JWT auth
    if (req.query.token) {
      return buyerController.getPortalData(req as any, res);
    }
    // Otherwise require authentication
    authenticate(req as any, res, (err?: unknown) => {
      if (err) return;
      buyerController.getPortalData(req as any, res);
    });
  })
);

// GET /api/buyer/portal/:orderId — buyer portal order detail
router.get(
  '/portal/:orderId',
  asyncHandler(async (req, res) => {
    if (req.query.token) {
      return buyerController.getOrderDetail(req as any, res);
    }
    authenticate(req as any, res, (err?: unknown) => {
      if (err) return;
      buyerController.getOrderDetail(req as any, res);
    });
  })
);

export default router;
