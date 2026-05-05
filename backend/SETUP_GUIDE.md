# Backend Setup & Deployment Guide

## Part 1: Google Cloud Console Setup (Manual)

### Step 1: Create/Select Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click project dropdown at top
3. Click "NEW PROJECT"
4. Name: `life-dashboard` 
5. Click "CREATE"
6. Wait for project to initialize (shows in dropdown when ready)

### Step 2: Enable Required APIs

For each API below:
1. Search for the API name in search bar at top
2. Click the result
3. Click "ENABLE"

**Required APIs:**
- Google Calendar API
- Google Tasks API
- Gmail API

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"** at top
3. Choose **"OAuth client ID"**
4. If prompted: Create OAuth consent screen first:
   - User type: **External**
   - Fill in: App name, User support email, Developer email
   - Scopes: Click "ADD OR REMOVE SCOPES"
     - Search and add:
       - `https://www.googleapis.com/auth/calendar.readonly`
       - `https://www.googleapis.com/auth/tasks.readonly`
       - `https://www.googleapis.com/auth/gmail.readonly`
     - Click "UPDATE"
   - Click "SAVE AND CONTINUE" through remaining screens
5. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Life Dashboard Backend`
   - Authorized JavaScript origins: Add `http://localhost:3001`
   - Authorized redirect URIs: Add `http://localhost:3001/api/auth/google/callback`
   - Click "CREATE"

### Step 4: Get Credentials

1. From Credentials page, find your "Web application" credential
2. Click it to open details
3. **Copy and save:**
   - Client ID
   - Client Secret

**Keep these safe!** Don't commit to git.

### Step 5: Test Redirect URI (Optional)

If you get "Redirect URI mismatch" errors:
1. Go to your credential
2. Click edit (pencil icon)
3. Under "Authorized redirect URIs":
   - Local dev: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
4. Save

---

## Part 2: Local Backend Setup

### Step 1: Navigate to backend directory

```bash
cd backend
```

### Step 2: Create `.env` file

```bash
cp .env.example .env
```

### Step 3: Edit `.env` with your values

```bash
# Open in your editor
nano .env  # or use VS Code

# Fill in these with values from Google Cloud:
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Generate a random secret (use any 32+ char string):
# Run this in terminal to generate one:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=generated-secret-here

# For local development:
FRONTEND_ORIGIN=http://localhost:3000
PORT=3001
NODE_ENV=development
```

### Step 4: Install dependencies

```bash
npm install
```

### Step 5: Start development server

```bash
npm run dev
```

Output should show:
```
Life Dashboard API running on port 3001
Frontend origin: http://localhost:3000
Environment: development
```

### Step 6: Test the server

In another terminal:
```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"ok","timestamp":"2026-05-05T14:23:00.000Z"}
```

---

## Part 3: Frontend Configuration (Update google-config.js)

Your frontend file `google-config.js` currently has placeholder URLs. Update them:

```javascript
window.LIFE_DASHBOARD_CONFIG = {
  google: {
    clientId: 'your-client-id.apps.googleusercontent.com',  // From Step 1
    authCodeEndpoint: 'http://localhost:3001/api/auth/google/code',
    sessionEndpoint: 'http://localhost:3001/api/auth/session',
    bootstrapEndpoint: 'http://localhost:3001/api/google/bootstrap',
    logoutEndpoint: 'http://localhost:3001/api/auth/logout',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/tasks.readonly',
      'https://www.googleapis.com/auth/gmail.readonly'
    ]
  }
};
```

---

## Part 4: Test Local Integration

### Step 1: Start both frontend and backend

**Terminal 1 - Frontend:**
```bash
cd ..  # parent directory
python3 -m http.server 3000
# or use any local server: npx http-server -p 3000
```

**Terminal 2 - Backend:**
```bash
npm run dev
```

### Step 2: Open dashboard

Go to: `http://localhost:3000/life-dashboard.html`

### Step 3: Test auth flow

1. Click "Connect Google" button
2. Google popup opens
3. Sign in with your Google account
4. Authorize requested permissions
5. Popup closes, dashboard loads data

**If this works, local setup is complete!**

---

## Part 5: Production Deployment

### Option A: Deploy to Vercel (Easiest)

1. **Push to GitHub**
```bash
git add backend/
git commit -m "Add backend scaffolding"
git push
```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import GitHub repo
   - Root directory: `backend`
   - Framework preset: `Node.js`

3. **Set Environment Variables** in Vercel dashboard:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET`
   - `FRONTEND_ORIGIN=https://yourusername.github.io` (your GitHub Pages URL)
   - `NODE_ENV=production`

4. **Update Google Cloud Console**
   - Go to your OAuth credential
   - Add new Authorized redirect URI: `https://your-vercel-url.vercel.app/api/auth/google/callback`
   - Add new Authorized JavaScript origin: `https://your-vercel-url.vercel.app`

5. **Update frontend `google-config.js`**
```javascript
window.LIFE_DASHBOARD_CONFIG = {
  google: {
    clientId: 'your-client-id.apps.googleusercontent.com',
    authCodeEndpoint: 'https://your-vercel-url.vercel.app/api/auth/google/code',
    sessionEndpoint: 'https://your-vercel-url.vercel.app/api/auth/session',
    bootstrapEndpoint: 'https://your-vercel-url.vercel.app/api/google/bootstrap',
    logoutEndpoint: 'https://your-vercel-url.vercel.app/api/auth/logout',
    // ... scopes
  }
};
```

6. **Deploy frontend to GitHub Pages**
```bash
git add google-config.js
git commit -m "Update backend URLs for production"
git push
```

### Option B: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "Create New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repo
5. Select `backend` as the root directory
6. Add environment variables (same as Vercel)
7. Railway auto-deploys

### Option C: Deploy to a VPS (DigitalOcean, AWS, Linode)

1. **SSH into your server**
```bash
ssh root@your-server-ip
```

2. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clone repository**
```bash
git clone https://github.com/yourusername/life-dashboard.git
cd life-dashboard/backend
```

4. **Create .env file**
```bash
nano .env
# Paste production values
```

5. **Install PM2 (process manager)**
```bash
sudo npm install -g pm2
```

6. **Start with PM2**
```bash
pm2 start src/index.js --name "life-dashboard-api"
pm2 save
pm2 startup
```

7. **Set up reverse proxy (Nginx)**
```bash
sudo apt-get install -y nginx
```

Create `/etc/nginx/sites-available/life-dashboard`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and start:
```bash
sudo ln -s /etc/nginx/sites-available/life-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

8. **Enable HTTPS with Let's Encrypt**
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## Part 6: Verification Checklist

### Local Development
- [ ] Backend starts without errors: `npm run dev`
- [ ] Health check works: `curl http://localhost:3001/health`
- [ ] Frontend loads at `http://localhost:3000`
- [ ] "Connect Google" button works
- [ ] Credentials are stored in .env (not committed)
- [ ] All Google APIs enabled in Cloud Console

### Production
- [ ] Backend deployed and accessible
- [ ] HTTPS enabled (green lock in browser)
- [ ] OAuth redirect URI matches in Google Cloud Console
- [ ] FRONTEND_ORIGIN environment variable matches GitHub Pages URL
- [ ] Session cookies are secure (HttpOnly, Secure flags)
- [ ] Token refresh works (test 1 hour after login)
- [ ] Logout clears all data
- [ ] Error logs are being captured

### Security
- [ ] No secrets committed to git
- [ ] SESSION_SECRET is 32+ random characters
- [ ] HTTPS enforced in production
- [ ] CORS only allows your frontend URL
- [ ] Sensitive errors don't leak to client in production

---

## Common Issues & Fixes

### "Invalid authorization code" in browser console

**Cause**: Frontend sending code to wrong endpoint or code expired

**Fix**:
1. Check `google-config.js` has correct `authCodeEndpoint`
2. Check backend `.env` has correct `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Refresh page and try again (code only valid for few minutes)

### "CORS error" in browser

**Cause**: `FRONTEND_ORIGIN` doesn't match your actual frontend URL

**Fix**:
1. Check browser URL matches `FRONTEND_ORIGIN` in backend `.env` exactly
2. Include `http://` or `https://`
3. Don't include trailing slash
4. Restart backend after changing `.env`

### "Missing GOOGLE_CLIENT_ID" error

**Cause**: `.env` file not found or values missing

**Fix**:
```bash
# Verify .env exists in backend/ directory
ls -la .env

# Check it has values
cat .env

# Recreate if needed
cp .env.example .env
# Edit with your values
```

### "Redirect URI mismatch" from Google

**Cause**: Redirect URI in Google Cloud Console doesn't match backend URL

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth credential
3. Check "Authorized redirect URIs" includes:
   - Local: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
4. Save and wait a few minutes for changes to propagate

### Session lost after backend restart

**Cause**: Using in-memory session store (expected in development)

**Fix**: For production, switch to Redis store (see README.md Production Upgrades)

---

## Next Steps

1. ✅ Complete all steps above
2. ✅ Test local integration works
3. ✅ Deploy backend to production
4. ✅ Update frontend URLs
5. ✅ Deploy frontend to GitHub Pages
6. ✅ Test production auth flow
7. 📋 Consider production upgrades from README.md

---

## Support Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [Google Tasks API](https://developers.google.com/tasks/api)
- [Gmail API](https://developers.google.com/gmail/api)
- [Express.js Documentation](https://expressjs.com/)
- [Node.js Sessions Best Practices](https://nodejs.org/en/docs/guides/nodejs-web-app-sec-basics/)
