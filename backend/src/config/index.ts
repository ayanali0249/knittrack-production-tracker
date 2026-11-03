import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  },

  rateLimit: {
    apiMax: parseInt(
      process.env.RATE_LIMIT_API_MAX ||
        (process.env.NODE_ENV === 'production' ? '100' : '5000'),
      10
    ),
    authMax: parseInt(
      process.env.RATE_LIMIT_AUTH_MAX ||
        (process.env.NODE_ENV === 'production' ? '10' : '200'),
      10
    ),
    windowMs: 15 * 60 * 1000,
  },
};
