import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger.js';

const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
};

if (!googleConfig.clientId || !googleConfig.clientSecret) {
  logger.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment');
}

export const oauth2Client = new OAuth2Client({
  clientId: googleConfig.clientId,
  clientSecret: googleConfig.clientSecret,
  redirectUri: googleConfig.redirectUri
});

export { googleConfig };
