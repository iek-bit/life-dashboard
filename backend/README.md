# Life Dashboard Backend

Secure Node.js backend for the Life Dashboard frontend with Google OAuth integration.

## Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4
- **Session**: express-session (memory store for dev, upgrade to Redis for production)
- **OAuth**: google-auth-library
- **Cache**: node-cache (in-memory, optional upgrade to Redis)
- **HTTP Client**: axios

## Why This Stack?

1. **Simple & Solo-Developer Friendly**: Express is minimal with low boilerplate
2. **No Database Required for MVP**: Sessions stored in memory, can upgrade to Redis
3. **Easy to Deploy**: Works on Vercel, Railway, Render, or any Node.js host
4. **Good Google Integration**: google-auth-library is official and well-maintained
5. **Security-First**: Built-in CORS, secure session cookies, no password handling

## Architecture

```
backend/
├── src/
│   ├── config/
│   │   └── google.js           # Google OAuth configuration
│   ├── middleware/
│   │   └── auth.js             # Authentication & CORS validation
│   ├── routes/
│   │   └── auth.js             # OAuth, session, bootstrap endpoints
│   ├── services/
│   │   ├── google.js           # Google Calendar, Tasks, Gmail APIs
│   │   └── cache.js            # In-memory cache layer
│   ├── utils/
│   │   └── logger.js           # Logging utilities
│   └── index.js                # Express app setup
├── package.json                # Dependencies
├── .env.example                # Environment template
└── README.md                   # This file
```

## Local Setup

### 1. Copy environment file

```bash
cp .env.example .env
```

### 2. Fill in your Google OAuth credentials

```bash
# Get these from Google Cloud Console
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Generate a random 32+ character string
SESSION_SECRET=your-super-secret-session-key-here

# Frontend URL (for local development)
FRONTEND_ORIGIN=http://localhost:3000
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

## API Endpoints

### `POST /api/auth/google/code`
**Exchange authorization code for session**

Frontend sends the code from Google OAuth popup:
```json
{
  "code": "4/0AX4XfW...",
  "scope": "openid email profile https://www.googleapis.com/auth/calendar.readonly ...",
  "redirectUri": "http://localhost:3000"
}
```

Response:
```json
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "id": "123456789",
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://..."
  }
}
```

### `GET /api/auth/session`
**Check authentication status**

Response (authenticated):
```json
{
  "authenticated": true,
  "profile": {
    "id": "123456789",
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://..."
  },
  "services": {
    "calendar": true,
    "tasks": true,
    "gmail": true,
    "fit": false
  },
  "lastSync": "2026-05-05T14:23:00.000Z"
}
```

Response (not authenticated):
```json
{
  "authenticated": false
}
```

### `GET /api/google/bootstrap`
**Fetch all dashboard data (calendar, tasks, gmail)**

Requires: Active session

Response:
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "picture": "..." },
  "data": {
    "calendar": {
      "events": [
        {
          "id": "event123",
          "title": "Team Meeting",
          "startTime": "2026-05-05T09:00:00",
          "endTime": "2026-05-05T10:00:00",
          "isAllDay": false,
          "htmlLink": "https://..."
        }
      ],
      "lastSync": "2026-05-05T14:23:00.000Z"
    },
    "tasks": {
      "items": [
        {
          "id": "task123",
          "listId": "list123",
          "listTitle": "My Tasks",
          "title": "Complete project",
          "completed": false,
          "dueDate": "2026-05-10"
        }
      ],
      "lastSync": "2026-05-05T14:23:00.000Z"
    },
    "gmail": {
      "metadata": {
        "emailAddress": "user@gmail.com",
        "messagesTotal": 2341,
        "unreadCount": 23,
        "unreadMessages": [...]
      },
      "lastSync": "2026-05-05T14:23:00.000Z"
    }
  },
  "services": { "calendar": true, "tasks": true, "gmail": true, "fit": false }
}
```

### `POST /api/auth/logout`
**Destroy session and clear all user data**

Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Deployment

### Option 1: Vercel (Recommended for simplicity)

1. Push code to GitHub
2. Import repository to Vercel
3. Set environment variables in Vercel dashboard
4. Vercel auto-deploys on push

**Note**: Vercel's serverless sessions are stateless. For production, upgrade to Redis:

```bash
# In Vercel environment, add:
REDIS_URL=your-redis-url-here
```

Then update session store in `src/index.js` to use Redis.

### Option 2: Railway

1. Connect GitHub repository
2. Railway auto-detects Node.js
3. Add environment variables
4. Deploy

### Option 3: Self-hosted (DigitalOcean, AWS, Heroku)

```bash
# Install dependencies
npm install

# Set environment variables
export GOOGLE_CLIENT_ID=...
export SESSION_SECRET=...
# ... etc

# Start server
NODE_ENV=production npm start
```

## Manual Checklist

- [ ] **Google Cloud Setup**
  - [ ] Create Google Cloud project at console.cloud.google.com
  - [ ] Enable Google Calendar API
  - [ ] Enable Google Tasks API
  - [ ] Enable Gmail API
  - [ ] Create OAuth 2.0 credentials (Web application)
  - [ ] Add redirect URI: `http://localhost:3001/api/auth/google/callback`
  - [ ] Copy Client ID and Secret

- [ ] **Environment Setup**
  - [ ] Create `.env` file in backend directory
  - [ ] Add GOOGLE_CLIENT_ID
  - [ ] Add GOOGLE_CLIENT_SECRET
  - [ ] Generate and add SESSION_SECRET (min 32 characters)
  - [ ] Set FRONTEND_ORIGIN to your frontend URL
  - [ ] Add PORT (default 3001)

- [ ] **Local Testing**
  - [ ] Run `npm install`
  - [ ] Run `npm run dev`
  - [ ] Verify server starts on port 3001
  - [ ] Test health endpoint: `curl http://localhost:3001/health`

- [ ] **Frontend Configuration**
  - [ ] Update google-config.js with correct backend URL
  - [ ] Update authCodeEndpoint, sessionEndpoint, bootstrapEndpoint
  - [ ] Test OAuth flow in browser

- [ ] **Production Deployment**
  - [ ] Choose hosting platform (Vercel, Railway, etc.)
  - [ ] Update GOOGLE_REDIRECT_URI to production domain
  - [ ] Update FRONTEND_ORIGIN to production frontend URL
  - [ ] Add new redirect URI to Google Cloud console
  - [ ] Enable HTTPS (all hosting platforms do this automatically)
  - [ ] Test full auth flow in production

- [ ] **Post-Deployment**
  - [ ] Monitor logs for errors
  - [ ] Test session persistence (refresh browser)
  - [ ] Test token refresh (wait 1 hour for expiry)
  - [ ] Test logout clears data

## Security Notes

### ✅ Implemented

- ✅ Google OAuth 2.0 authorization code flow (no password collection)
- ✅ Secure session cookies (httpOnly, secure in production)
- ✅ CORS validation (whitelist FRONTEND_ORIGIN)
- ✅ Token storage only on backend (never sent to frontend)
- ✅ Environment variables for all secrets
- ✅ Token refresh support before expiry
- ✅ Session timeout (24 hours)
- ✅ Cache invalidation on logout
- ✅ Request validation (require auth, check origin)

### ⚠️ NOT YET PRODUCTION-READY

1. **Session Store**: Uses in-memory storage
   - **Risk**: Sessions lost on server restart, doesn't scale across multiple servers
   - **Fix**: Add Redis store for production
   ```bash
   npm install connect-redis redis
   ```
   Then update session config in `src/index.js`

2. **CSRF Protection**: Not implemented
   - **Risk**: Cross-site request forgery on POST endpoints
   - **Fix**: Add csurf middleware for token validation

3. **Rate Limiting**: No rate limits on auth endpoints
   - **Risk**: Brute force attempts on /api/auth/google/code
   - **Fix**: Add express-rate-limit middleware

4. **Input Validation**: Minimal validation
   - **Risk**: Malformed requests could cause issues
   - **Fix**: Add joi or zod schema validation

5. **HTTPS Enforcement**: Only enforced in production
   - **Risk**: Credentials transmitted in plain text on localhost (acceptable for dev)
   - **Fix**: Always use HTTPS in production (handled by hosting platform)

6. **Token Refresh Logic**: Basic implementation
   - **Risk**: Race conditions if multiple requests happen near expiry
   - **Fix**: Add mutex lock for token refresh

7. **Error Handling**: Detailed errors in dev, generic in production
   - **Risk**: Information leakage in logs
   - **Fix**: Implement structured logging, don't log sensitive data

8. **Monitoring**: No error tracking
   - **Risk**: Production errors go unnoticed
   - **Fix**: Add Sentry or similar error tracking

## Recommended Production Upgrades

### Phase 1 (Required)
1. Redis session store
2. Rate limiting on auth endpoints
3. CSRF protection
4. Input validation

### Phase 2 (Recommended)
1. Error tracking (Sentry)
2. Structured logging (Winston)
3. Request monitoring
4. Automated tests

### Phase 3 (Nice to have)
1. Database for user profile caching
2. Webhook support for Google events
3. Multi-provider auth (Microsoft, Apple, etc.)
4. Google Fit integration
5. Offline support

## Development

### Run tests (if added)
```bash
npm test
```

### Lint code
```bash
npm run lint
```

### Debug mode
```bash
DEBUG=* npm run dev
```

## Troubleshooting

### "Invalid authorization code" error
- **Cause**: Code has expired or is invalid
- **Fix**: Frontend should refresh the page and try signing in again

### "Token expired" error
- **Cause**: Access token expired
- **Fix**: System automatically refreshes token, or user needs to sign in again

### Session lost after server restart
- **Cause**: Using in-memory session store
- **Fix**: For production, implement Redis session store

### CORS error from frontend
- **Cause**: FRONTEND_ORIGIN not matching
- **Fix**: Check that FRONTEND_ORIGIN in .env matches actual frontend URL exactly (including protocol)

### "Missing Google APIs"
- **Cause**: Google APIs not enabled in Google Cloud Console
- **Fix**: Enable Calendar, Tasks, and Gmail APIs in Google Cloud project settings

## Support

For issues or questions:
1. Check logs: `npm run dev` shows detailed error messages
2. Verify .env file has all required variables
3. Test endpoints directly with curl or Postman
4. Check Google Cloud Console scopes and redirect URIs match
