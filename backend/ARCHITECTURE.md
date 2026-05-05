# Backend Architecture & Design

## Overview

The Life Dashboard backend is a lightweight Node.js API that:
- Securely handles Google OAuth 2.0 authentication
- Manages user sessions with secure cookies
- Fetches data from Google Calendar, Tasks, and Gmail APIs
- Returns normalized data to the frontend
- Uses in-memory caching for performance

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
│         (GitHub Pages - life-dashboard.html)                    │
└────────────────┬────────────────────────────────────────────────┘
                 │ CORS-enabled HTTP requests
                 │ (credentials: include)
                 │
    ┌────────────▼──────────────────────────────────┐
    │  Backend (Express.js)                         │
    │  ┌────────────────────────────────────────┐   │
    │  │ CORS Middleware                        │   │
    │  │ - Validates FRONTEND_ORIGIN            │   │
    │  │ - Sets secure headers                  │   │
    │  └────────────────────────────────────────┘   │
    │  ┌────────────────────────────────────────┐   │
    │  │ Session Manager                        │   │
    │  │ - express-session                      │   │
    │  │ - Stores user auth tokens              │   │
    │  │ - Secure httpOnly cookies              │   │
    │  └────────────────────────────────────────┘   │
    │  ┌────────────────────────────────────────┐   │
    │  │ OAuth Handler                          │   │
    │  │ - Exchanges code for tokens            │   │
    │  │ - Stores tokens server-side only       │   │
    │  │ - Never exposes to frontend            │   │
    │  └────────────────────────────────────────┘   │
    │  ┌────────────────────────────────────────┐   │
    │  │ Google API Layer                       │   │
    │  │ - Makes authenticated requests         │   │
    │  │ - Handles token refresh                │   │
    │  │ - Normalizes API responses             │   │
    │  └────────────────────────────────────────┘   │
    │  ┌────────────────────────────────────────┐   │
    │  │ Cache Layer (Node-Cache)               │   │
    │  │ - 5-min TTL for Google API responses   │   │
    │  │ - Reduces API quota usage              │   │
    │  │ - Invalidated on logout                │   │
    │  └────────────────────────────────────────┘   │
    └────────────────┬───────────────────────────────┘
                     │
    ┌────────────────▼──────────────────────────────┐
    │  Google APIs                                  │
    │  ┌──────────────┐ ┌──────────┐ ┌──────────┐   │
    │  │Calendar API  │ │Tasks API │ │Gmail API │   │
    │  └──────────────┘ └──────────┘ └──────────┘   │
    └───────────────────────────────────────────────┘
```

## Data Flow

### 1. Authentication Flow

```
User clicks "Connect Google"
         ↓
Frontend shows Google OAuth popup
         ↓
User grants permissions
         ↓
Google returns authorization code
         ↓
Frontend sends code to /api/auth/google/code
         ↓
Backend exchanges code for access + refresh tokens
         ↓
Backend stores tokens in session (server-side only)
         ↓
Backend creates secure session cookie
         ↓
Backend returns user profile to frontend
         ↓
Frontend stores user info (no tokens!)
         ↓
Frontend calls /api/google/bootstrap
         ↓
Dashboard loads with user data
```

### 2. Data Fetch Flow

```
Frontend requests /api/google/bootstrap
         ↓
Backend middleware checks session
         ↓
Backend uses stored access token from session
         ↓
Backend makes 3 parallel Google API calls:
  - Calendar API (events for next 7 days)
  - Tasks API (all incomplete tasks)
  - Gmail API (unread count + sample messages)
         ↓
Results cached for 5 minutes
         ↓
Backend normalizes responses:
  - Consistent field names
  - Timezone handling
  - Filter read-only data
  - Remove sensitive fields
         ↓
Backend returns aggregated response to frontend
         ↓
Frontend updates dashboard state
```

### 3. Session Lifecycle

```
Authentication
     ↓
Session created (24-hour expiry)
     ↓
Secure httpOnly cookie set in browser
     ↓
Browser automatically includes cookie on requests
     ↓
Backend validates session on each request
     ↓
Access token refreshed if near expiry
     ↓
Logout called → Session destroyed → Cookie cleared
```

## Security Model

### Token Handling

**Frontend perspective**: Never sees tokens
```javascript
// Frontend NEVER gets this
// {accessToken: "...", refreshToken: "..."}

// Frontend ONLY gets this:
{
  user: { id: "...", email: "...", name: "..." },
  services: { calendar: true, tasks: true, gmail: true }
}
```

**Backend perspective**: Tokens stored in session memory
```javascript
req.session.user = {
  id: "...",
  email: "...",
  name: "...",
  tokens: {
    access_token: "...",      // Used for API calls
    refresh_token: "...",     // Stored for renewal
    expiry_date: 1234567890   // Checked on each request
  }
}
```

### CORS Security

```javascript
// Only requests from FRONTEND_ORIGIN are allowed
cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'OPTIONS']
})
```

### Session Cookie Security

| Setting | Dev | Production | Purpose |
|---------|-----|------------|---------|
| secure | false | true | Only send over HTTPS |
| httpOnly | true | true | Prevent JS access (no XSS damage) |
| sameSite | Lax | None | Prevent CSRF attacks |
| maxAge | 24h | 24h | Auto-logout after 24 hours |

### Request Validation

1. **Origin check**: CORS middleware validates `Origin` header
2. **Auth check**: `requireAuth` middleware checks session exists
3. **Token check**: Verify access token not expired, refresh if needed

## Endpoint Behaviors

### POST /api/auth/google/code

**Security checks:**
- Validates authorization code with Google servers
- Verifies code hasn't been used before
- Checks code matches registered redirect URI

**Session creation:**
- Stores tokens securely (server memory only)
- Sets httpOnly cookie
- 24-hour expiry

**Response:**
- Returns user profile (no tokens!)
- Returns enabled services list

### GET /api/auth/session

**Security checks:**
- Verifies session exists
- Checks session not expired
- No actual API calls made

**Performance:**
- Very fast (no Google API calls)
- Can be called frequently for polling

**Use cases:**
- Frontend checking if still logged in (on page refresh)
- Validating session before showing dashboard

### GET /api/google/bootstrap

**Security checks:**
- Requires valid session
- Validates access token
- Refreshes token if expiring

**Caching:**
- Results cached for 5 minutes per user
- Cache invalidated on logout
- Cache key includes user ID (prevents cross-user leak)

**Data normalization:**
- Removes sensitive fields
- Standardizes timestamps
- Consistent field names across providers

**Performance:**
- 3 parallel API requests (Calendar, Tasks, Gmail)
- Partial failures don't break dashboard
- ~1-2 second response time (cold) / ~50ms (cached)

### POST /api/auth/logout

**Security cleanup:**
- Clears session data
- Invalidates all cached data for user
- Destroys session cookie
- Backend forgets tokens entirely

**Frontend cleanup:**
- Clears user state
- Removes cached data
- Redirects to login page

## Data Normalization

### Calendar Events
```javascript
// Google API returns:
{
  id: "event123",
  summary: "Team Meeting",
  start: { dateTime: "2026-05-05T09:00:00-07:00" },
  end: { dateTime: "2026-05-05T10:00:00-07:00" }
}

// Backend normalizes to:
{
  id: "event123",
  title: "Team Meeting",
  startTime: "2026-05-05T09:00:00-07:00",
  endTime: "2026-05-05T10:00:00-07:00",
  isAllDay: false,
  htmlLink: "https://..."
}
```

### Tasks
```javascript
// Flattens multiple task lists into single array
// Includes list metadata with each task
// Removes completed tasks (optional)
// Sorts by: completion status → due date → position
```

### Gmail
```javascript
// Only returns:
// - Unread count (not the email content)
// - Sample of recent unread messages
// - Email address (for profile)
// Returns metadata only (not full email bodies)
```

## Error Handling

### Token Expiry (Normal)
```
1. Frontend requests /api/google/bootstrap
2. Backend detects expiry_date in past
3. Backend calls oauth2Client.refreshAccessToken()
4. Google returns new access token
5. Backend updates session
6. Request continues normally
7. Frontend doesn't know this happened
```

### Token Expiry (Refresh fails)
```
1. Frontend requests /api/google/bootstrap
2. Backend attempts refresh
3. Refresh fails (e.g., user revoked access)
4. Backend returns 401
5. Frontend detects 401
6. Frontend shows "Please sign in again"
7. User clicks "Connect Google" → new auth flow
```

### API Rate Limits
```
Google APIs have quotas (e.g., Calendar: 100,000/day)
If quota exceeded:
1. Google returns 403 error
2. Backend logs error
3. Backend returns cached data (if available)
4. Frontend shows dashboard with potentially stale data
```

### Network Failures
```
If network request to Google fails:
1. Backend returns partial data (what it could fetch)
2. Frontend displays "Loading..." for failed sections
3. User can retry by calling /api/google/bootstrap again
```

## Performance Characteristics

### Cold startup
- First /api/google/bootstrap call: ~2-3 seconds
- Makes 3 sequential API requests to Google
- All 3 must complete before response

### Cached response
- Subsequent calls within 5 minutes: ~50ms
- Data served from memory cache
- No Google API calls

### Cache invalidation
- On logout: immediate (cacheService.invalidateUserData)
- On timeout: automatic after 5 minutes
- Manual refresh: frontend calls bootstrap again

### Session memory usage
- Per user: ~2-5 KB (tokens + profile)
- 1000 users: ~2-5 MB RAM
- Acceptable for small teams

## Future Improvements

### Scalability
- **Current**: Single server, in-memory sessions
- **Issue**: Doesn't scale past 1 server
- **Fix**: Add Redis for distributed sessions
- **Impact**: ~50 lines code change

### Reliability
- **Current**: In-memory cache lost on restart
- **Fix**: Add Redis cache persistence
- **Impact**: Better reliability, same performance

### Offline Support
- **Current**: Always requires backend connectivity
- **Fix**: Store bootstrap data in IndexedDB
- **Impact**: Works offline, syncs when online

### Rate Limiting
- **Current**: None implemented
- **Fix**: Add express-rate-limit
- **Impact**: Protection from abuse

### Monitoring
- **Current**: Logs to stdout
- **Fix**: Add Sentry error tracking
- **Impact**: Visibility into production issues

### Multi-user
- **Current**: Each user isolated (secure)
- **Fix**: Already implemented correctly
- **Impact**: Can safely run for teams

## Testing Checklist

### Local Development
- [ ] Can exchange code for token
- [ ] Session persists across requests
- [ ] Bootstrap returns all 3 data types
- [ ] Logout clears session
- [ ] Cache works (second request faster)
- [ ] Token refresh works (after ~1 hour)

### Production Deployment
- [ ] HTTPS enforced
- [ ] CORS working (cross-domain requests)
- [ ] Sessions persist after refresh
- [ ] Token refresh works
- [ ] Errors logged properly
- [ ] No secrets in logs

### Edge Cases
- [ ] User revokes Google permission
- [ ] Token expires mid-request
- [ ] Google API quota exceeded
- [ ] Network timeout on API call
- [ ] Invalid session cookie
- [ ] Logout while data loading

## Deployment Readiness Checklist

- [ ] All environment variables documented
- [ ] Error messages don't leak secrets
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Session timeout set (24 hours)
- [ ] Logging configured
- [ ] Monitoring/alerting in place
- [ ] Secrets not in git history
- [ ] Database ready (if using)
- [ ] Load testing done (if high traffic)
