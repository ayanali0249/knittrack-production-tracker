import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * General API rate limiter:
 * - Production: 100 requests per 15 minutes per IP.
 * - Development: 5,000 requests per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

/**
 * Auth rate limiter:
 * - Production: 10 login attempts per 15 minutes per IP.
 * - Development: 200 login attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  },
});
