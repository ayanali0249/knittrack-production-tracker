/**
 * Production stage constants and AI categories for KnitTrack.
 */

// Standard production stages in sequence order
export const PRODUCTION_STAGES = [
  { name: 'Cutting', sequence: 1 },
  { name: 'Printing', sequence: 2 },
  { name: 'Stitching', sequence: 3 },
  { name: 'Washing', sequence: 4 },
  { name: 'Finishing', sequence: 5 },
  { name: 'Packing', sequence: 6 },
] as const;

export type ProductionStageName = (typeof PRODUCTION_STAGES)[number]['name'];

// AI classification categories
export const AI_CATEGORIES = [
  'Machine breakdown',
  'Labour shortage',
  'Material shortage',
  'Quality issue',
  'Power outage',
  'Supplier delay',
  'Weather disruption',
  'Other',
] as const;

export type AICategoryType = (typeof AI_CATEGORIES)[number];

// Risk thresholds (in business days)
export const RISK_THRESHOLDS = {
  AT_RISK_DELAY_DAYS: 3,     // projected delay > 0 and <= 3 days → AT_RISK
  DELAYED_DELAY_DAYS: 3,     // projected delay > 3 days → DELAYED
  RATE_PRESSURE_FACTOR: 1.2, // requiredRate > actualRate * 1.2 → AT_RISK
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Cookie settings
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // set true in production via config
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

// Upload settings
export const UPLOAD = {
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  MAX_FILES_PER_UPDATE: 5,
} as const;
