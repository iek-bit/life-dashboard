import { logger } from '../utils/logger.js';

/**
 * Middleware to check if user is authenticated via session
 */
export const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    logger.warn('Unauthorized access attempt');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

/**
 * Middleware to validate CORS origin
 */
export const validateOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigin = process.env.FRONTEND_ORIGIN;
  
  if (origin !== allowedOrigin) {
    logger.warn(`Invalid origin: ${origin}`);
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  
  next();
};
