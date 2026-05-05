import express from 'express';
import { oauth2Client, googleConfig } from '../config/google.js';
import { googleServices } from '../services/google.js';
import { cacheService } from '../services/cache.js';
import { logger } from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/google/code
 * Exchange authorization code for tokens and create session
 * 
 * Frontend sends:
 * {
 *   code: string (from Google OAuth),
 *   scope: string (space-separated scopes requested),
 *   redirectUri: string (should match backend GOOGLE_REDIRECT_URI)
 * }
 */
router.post('/google/code', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      logger.warn('Missing authorization code in request');
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for tokens
    let tokens;
    try {
      const response = await oauth2Client.getToken(code);
      tokens = response.tokens;
    } catch (error) {
      logger.error('Token exchange failed:', error.message);
      return res.status(401).json({ error: 'Invalid authorization code' });
    }

    // Set credentials for API calls
    oauth2Client.setCredentials(tokens);

    // Fetch user profile
    let userProfile;
    try {
      userProfile = await googleServices.getUserProfile(tokens.access_token);
    } catch (error) {
      logger.error('Failed to fetch user profile:', error.message);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    // Create session
    req.session.user = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      picture: userProfile.picture,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      },
      authenticated: true,
      authenticatedAt: new Date().toISOString()
    };

    req.session.services = {
      calendar: true,
      tasks: true,
      gmail: true,
      fit: false // Not implemented in v1
    };

    logger.info(`User authenticated: ${userProfile.email}`);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        picture: userProfile.picture
      }
    });
  } catch (error) {
    logger.error('Authentication error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/session
 * Check if user is authenticated and return session info
 */
router.get('/session', (req, res) => {
  if (!req.session?.user?.authenticated) {
    logger.debug('Session check: not authenticated');
    return res.status(200).json({
      authenticated: false
    });
  }

  logger.debug(`Session check: user ${req.session.user.email}`);
  res.status(200).json({
    authenticated: true,
    profile: {
      id: req.session.user.id,
      email: req.session.user.email,
      name: req.session.user.name,
      picture: req.session.user.picture
    },
    services: req.session.services,
    lastSync: req.session.lastSync || null
  });
});

/**
 * GET /api/google/bootstrap
 * Fetch all Google data (calendar, tasks, gmail) for the dashboard
 * Frontend calls this after auth to populate the dashboard
 */
router.get('/bootstrap', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const accessToken = req.session.user.tokens.access_token;

    logger.info(`Bootstrap data request for user: ${userId}`);

    // Check token expiry and refresh if needed
    if (req.session.user.tokens.expiry_date && new Date() >= new Date(req.session.user.tokens.expiry_date)) {
      logger.info('Token expired, attempting refresh');
      try {
        oauth2Client.setCredentials(req.session.user.tokens);
        const { credentials } = await oauth2Client.refreshAccessToken();
        req.session.user.tokens = {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || req.session.user.tokens.refresh_token,
          expiry_date: credentials.expiry_date
        };
        logger.info('Token refreshed successfully');
      } catch (error) {
        logger.error('Token refresh failed:', error.message);
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      }
    }

    // Fetch all data in parallel
    let calendarEvents = [];
    let tasks = [];
    let gmailMetadata = {};

    try {
      [calendarEvents, tasks, gmailMetadata] = await Promise.allSettled([
        googleServices.getCalendarEvents(req.session.user.tokens.access_token, userId),
        googleServices.getTasks(req.session.user.tokens.access_token, userId),
        googleServices.getGmailMetadata(req.session.user.tokens.access_token, userId)
      ]).then(results => [
        results[0].status === 'fulfilled' ? results[0].value : [],
        results[1].status === 'fulfilled' ? results[1].value : [],
        results[2].status === 'fulfilled' ? results[2].value : {}
      ]);
    } catch (error) {
      logger.error('Error fetching bootstrap data:', error.message);
      // Continue with partial data rather than failing completely
    }

    // Update last sync time
    req.session.lastSync = new Date().toISOString();

    const bootstrap = {
      user: {
        id: req.session.user.id,
        email: req.session.user.email,
        name: req.session.user.name,
        picture: req.session.user.picture
      },
      data: {
        calendar: {
          events: calendarEvents,
          lastSync: req.session.lastSync
        },
        tasks: {
          items: tasks,
          lastSync: req.session.lastSync
        },
        gmail: {
          metadata: gmailMetadata,
          lastSync: req.session.lastSync
        }
      },
      services: req.session.services
    };

    logger.info(`Bootstrap data prepared: ${calendarEvents.length} events, ${tasks.length} tasks`);
    res.status(200).json(bootstrap);
  } catch (error) {
    logger.error('Bootstrap error:', error.message);
    res.status(500).json({ error: 'Failed to fetch bootstrap data' });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session and clear user data
 */
router.post('/logout', (req, res) => {
  const userEmail = req.session?.user?.email;
  
  // Invalidate cache for this user
  if (req.session?.user?.id) {
    cacheService.invalidateUserData(req.session.user.id);
  }

  // Clear session
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destruction error:', err.message);
      return res.status(500).json({ error: 'Logout failed' });
    }

    logger.info(`User logged out: ${userEmail}`);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;
