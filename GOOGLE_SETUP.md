# Google Integration Setup

This dashboard is now wired for a production-style Google integration flow:

1. The browser starts Google sign-in using Google Identity Services.
2. Google returns an authorization code to the browser.
3. The browser posts that code to your backend.
4. Your backend exchanges the code for tokens, stores the refresh token securely, creates a session, and returns normalized data to the frontend.

Important:

- Do not collect a Google password in this app.
- Do not run Google OAuth from `file://`.
- Serve the dashboard from `http://localhost` during development or `https://` in production.

## Frontend Files

- [life-dashboard.html](/Users/isaac/Desktop/Life%20Dashboard/life-dashboard.html)
- [google-config.js](/Users/isaac/Desktop/Life%20Dashboard/google-config.js)

## What The Frontend Expects

`google-config.js` should define:

- `clientId`
- `authCodeEndpoint`
- `sessionEndpoint`
- `bootstrapEndpoint`
- `logoutEndpoint`
- `scopes`

The default scopes currently requested are:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/tasks.readonly`
- `https://www.googleapis.com/auth/gmail.readonly`

## Required Backend Endpoints

### `POST /api/auth/google/code`

Receives:

```json
{
  "code": "google-auth-code",
  "scope": "space separated scopes",
  "redirectUri": "http://localhost:3000"
}
```

Backend responsibilities:

- Verify request origin / CSRF protection
- Exchange the auth code with Google for access and refresh tokens
- Store the refresh token securely
- Create or update the local user
- Create a session cookie

Response:

- `200 OK` or `204 No Content`

### `GET /api/auth/session`

Returns whether the current browser session is already connected.

Example response:

```json
{
  "authenticated": true,
  "profile": {
    "name": "Ada Lovelace",
    "email": "ada@example.com"
  },
  "services": {
    "calendar": true,
    "tasks": true,
    "gmail": true
  },
  "lastSync": "2026-05-04T18:32:00.000Z"
}
```

### `GET /api/google/bootstrap`

Returns normalized Google data for the dashboard zones.

Example response:

```json
{
  "authenticated": true,
  "profile": {
    "name": "Ada Lovelace",
    "email": "ada@example.com"
  },
  "lastSync": "2026-05-04T18:32:00.000Z",
  "calendar": {
    "primaryCalendarName": "Primary",
    "nextStart": "09:00",
    "events": [
      {
        "summary": "Team standup",
        "location": "Meet",
        "calendarName": "Primary",
        "start": "2026-05-05T09:00:00-05:00",
        "startLabel": "09:00"
      }
    ]
  },
  "tasks": {
    "primaryListTitle": "My Tasks",
    "openCount": 4,
    "completedToday": 2,
    "items": [
      {
        "title": "Ship dashboard integration",
        "listTitle": "My Tasks",
        "status": "needsAction",
        "dueLabel": "Today"
      }
    ]
  },
  "gmail": {
    "unreadCount": 23,
    "priorityCount": 5,
    "messages": [
      {
        "from": "Alex Chen",
        "subject": "Design system updates",
        "internalDate": "2026-05-04T09:41:00-05:00",
        "receivedLabel": "09:41"
      }
    ]
  }
}
```

### `POST /api/auth/logout`

Clears the current app session and disconnects the frontend.

## Google Cloud Setup You Still Need

1. Create a Google Cloud project.
2. Configure the OAuth consent screen.
3. Enable:
   - Google Calendar API
   - Google Tasks API
   - Gmail API
4. Create an OAuth 2.0 Web Application client.
5. Add authorized JavaScript origins such as:
   - `http://localhost:3000`
   - your production origin
6. Add any required redirect URIs if you change away from popup mode.
7. Put the client ID into [google-config.js](/Users/isaac/Desktop/Life%20Dashboard/google-config.js).

## Important Scope / Verification Notes

- `calendar.readonly` is a straightforward read-only scope.
- `tasks.readonly` is a straightforward read-only scope.
- `gmail.readonly` is a restricted Gmail scope and usually triggers stronger Google verification requirements than Calendar or Tasks.

If you want to reduce verification friction for an earlier milestone, start by connecting only Calendar and Tasks, then add Gmail after the rest of the flow is stable.

## Health / Google Fit

This frontend does not yet request a Google Fit or newer Google health scope.

That is intentional:

- health integrations deserve a separate data model and privacy pass
- Google’s health platform direction has changed over time
- the correct next step should be chosen deliberately before wiring scopes into production auth

## Development Note

Because this is now OAuth-aware, opening the HTML file directly with `open life-dashboard.html` is no longer enough for real Google sign-in.

Use a local server instead, for example:

```bash
python3 -m http.server 3000
```

Then open:

```text
http://localhost:3000/life-dashboard.html
```
