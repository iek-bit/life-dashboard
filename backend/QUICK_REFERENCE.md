# Quick Reference Guide

## 📝 Environment Variables Needed

```bash
# Google Cloud Console
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Generate random 32+ char string:
SESSION_SECRET=your-session-secret-here

# Server config
PORT=3001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
CACHE_TTL=300
```

## 🚀 Commands

### Local Development
```bash
# First time setup
cd backend
cp .env.example .env
nano .env  # edit with your values
npm install

# Every time you want to run
npm run dev

# Test server
curl http://localhost:3001/health
```

### Production
```bash
# Build (Node.js is interpreted, no build needed)
# Just deploy the entire backend/ directory

# Environment variables must be set in hosting platform
# (Vercel/Railway/VPS dashboard)
```

## 📡 API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/auth/google/code | No | Exchange Google code for session |
| GET | /api/auth/session | No | Check if logged in |
| GET | /api/google/bootstrap | ✅ Yes | Get calendar/tasks/email data |
| POST | /api/auth/logout | ✅ Yes | Log out and clear session |
| GET | /health | No | Server health check |

## 📊 Response Examples

### Success: Exchange Code
```bash
curl -X POST http://localhost:3001/api/auth/google/code \
  -H "Content-Type: application/json" \
  -d '{"code":"4/0AX4XfW..."}'

# Returns:
{
  "success": true,
  "user": {
    "id": "123456789",
    "email": "user@gmail.com",
    "name": "John Doe",
    "picture": "https://..."
  }
}
```

### Success: Check Session
```bash
curl -b "session-cookie" http://localhost:3001/api/auth/session

# Returns if authenticated:
{
  "authenticated": true,
  "profile": { "id": "...", "email": "...", "name": "...", "picture": "..." },
  "services": { "calendar": true, "tasks": true, "gmail": true },
  "lastSync": "2026-05-05T14:23:00.000Z"
}

# Returns if not authenticated:
{
  "authenticated": false
}
```

### Success: Bootstrap Data
```bash
curl -b "session-cookie" http://localhost:3001/api/google/bootstrap

# Returns:
{
  "user": { "id": "...", "email": "...", "name": "...", "picture": "..." },
  "data": {
    "calendar": {
      "events": [
        { "id": "...", "title": "...", "startTime": "...", "endTime": "..." }
      ]
    },
    "tasks": {
      "items": [
        { "id": "...", "title": "...", "completed": false, "dueDate": "..." }
      ]
    },
    "gmail": {
      "metadata": {
        "emailAddress": "user@gmail.com",
        "unreadCount": 23,
        "messagesTotal": 2341
      }
    }
  }
}
```

## 🔧 Debugging

### Check Environment
```bash
# Verify all required env vars are set
cat .env

# Check Node.js version (need 18+)
node --version
```

### View Logs
```bash
# Run with debug mode
npm run dev

# Logs show during development
# [INFO], [WARN], [ERROR] messages
```

### Test Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Check CORS
curl -H "Origin: http://localhost:3000" http://localhost:3001/health
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot find module 'express'" | Dependencies not installed | `npm install` |
| "GOOGLE_CLIENT_ID is not defined" | .env file missing or not sourced | `cp .env.example .env` then fill it |
| "Listen EADDRINUSE :::3001" | Port 3001 already in use | Change PORT in .env or kill other process |
| "CORS error" | FRONTEND_ORIGIN doesn't match | Check it matches exactly (protocol, domain, port) |
| "Invalid authorization code" | Code expired or invalid | Frontend should retry; code only valid 10 minutes |

## 📋 Deployment Checklist

### Before Deploying
- [ ] All env vars filled in .env
- [ ] npm install runs without errors
- [ ] npm run dev starts without errors
- [ ] Health check returns 200
- [ ] Google APIs enabled in Cloud Console
- [ ] OAuth credentials created
- [ ] Redirect URIs added to Google Console

### Deployment
- [ ] Choose platform (Vercel, Railway, or VPS)
- [ ] Set environment variables in platform dashboard
- [ ] Set FRONTEND_ORIGIN to production URL
- [ ] Set NODE_ENV=production
- [ ] Deploy code
- [ ] Verify /health endpoint returns 200

### Post-Deployment
- [ ] Update GOOGLE_REDIRECT_URI in Google Console
- [ ] Update frontend google-config.js URLs
- [ ] Test OAuth flow in production
- [ ] Verify session persists after page refresh
- [ ] Check logs for errors

## 🔐 Security Checklist

- [ ] .env never committed to git
- [ ] SESSION_SECRET is 32+ random characters
- [ ] HTTPS enabled in production
- [ ] FRONTEND_ORIGIN matches your frontend URL exactly
- [ ] CORS credentials included in frontend requests
- [ ] Session cookie is httpOnly (not accessible to JS)
- [ ] No tokens logged or sent to client
- [ ] Logout clears all user data

## 📚 Documentation Files

- **README.md** - Full API documentation & security notes
- **SETUP_GUIDE.md** - Step-by-step setup from scratch
- **ARCHITECTURE.md** - Design decisions & data flow
- **DELIVERY_SUMMARY.md** - What's been delivered & what's next

## 🆘 Quick Help

**"How do I get GOOGLE_CLIENT_ID?"**
→ See SETUP_GUIDE.md Part 1

**"How do I run this locally?"**
→ See SETUP_GUIDE.md Part 2

**"How do I deploy?"**
→ See SETUP_GUIDE.md Part 5

**"What's the security model?"**
→ See ARCHITECTURE.md section "Security Model"

**"Is this production ready?"**
→ See README.md section "NOT YET PRODUCTION-READY"

**"What doesn't work yet?"**
→ See DELIVERY_SUMMARY.md section "What's NOT Yet Protected"
