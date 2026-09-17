# Study Planner Pro

A responsive React study planner with a Node/Express API, PostgreSQL persistence, Gemini-powered assistance, Redis/Valkey caching, JWT authentication, in-app notifications, and optional Web Push/email reminders.

## Architecture

- `src/`: existing React screens and UI. `src/utils/api.js` is the authenticated API boundary.
- `server/app.js`: Express middleware, AI chat, notifications, rate limiting, and reminder worker.
- `server/routes-auth.js`: registration, login, JWT refresh/revocation, Google OAuth, verification, and reset flows.
- `server/db.js`: PostgreSQL connection pool.
- `server/schema.sql`: relational schema and indexes.
- `server/auth.js`: password hashing, JWTs, refresh tokens, and one-time tokens.
- `public/sw.js`: browser push service worker.

PostgreSQL is the only persistent application database. Redis/Valkey is optional and is used for AI response caching and distributed reminder-worker locking. Gemini keys exist only in `server/.env`.

## Migration Changes

- Removed Firebase client authentication and analytics.
- Replaced Firebase email/password auth with bcrypt-hashed PostgreSQL users and JWT access/refresh tokens.
- Migrated Google sign-in to server-side Google OAuth. Existing Google buttons remain in the UI.
- Removed Mongoose and MongoDB models for users, OTPs, and vector cache.
- Replaced MongoDB OTP records with PostgreSQL one-time tokens.
- Preserved existing React pages, local study data, AI modes, alarms, and navigation.
- Added PostgreSQL tables for study data, chats, quizzes, notifications, preferences, and push subscriptions.
- Added authenticated notification APIs, browser push opt-in, and a server-side reminder worker.

## Setup

### 1. Install dependencies

```powershell
npm install
Push-Location server
npm install
Pop-Location
```

### 2. Create databases

Create a PostgreSQL database named `study_planner`, then run:

```powershell
psql "$env:DATABASE_URL" -f server/schema.sql
```

Redis/Valkey is optional. A local PostgreSQL instance is required for authentication and persistent features.

### 3. Configure environment files

Copy `server/.env.example` to `server/.env` and fill in the server-only values. Copy `.env.example` to `.env` and set the frontend API URL. Never commit either `.env` file.

Required server values:

```env
DATABASE_URL=postgresql://user:password@host:5432/study_planner
JWT_SECRET=use-a-long-random-secret
GEMINI_API_KEY=your-server-only-key
ALLOWED_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5173
```

`ALLOWED_ORIGIN` accepts comma-separated frontend origins for production and
preview deployments. Use the exact browser origin without a path, for example
`https://your-app.vercel.app,https://your-preview.vercel.app`.

Optional values:

- `REDIS_URL` or `VALKEY_URL` for cache and worker coordination.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` for Google OAuth.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for email verification/reset messages.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` for browser push delivery.
- `VITE_VAPID_PUBLIC_KEY` in the frontend `.env` for the browser subscription request.

Generate VAPID keys with the `web-push` CLI or a one-time Node script. Only the public key belongs in the frontend.

## Run Locally

Start the frontend and backend together:

```powershell
npm run dev
```

Frontend-only mode:

```powershell
npm run dev:client
```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:5000`.

## API

All protected endpoints use `Authorization: Bearer <accessToken>`.

### Authentication

- `POST /api/auth/register` with `{ name, email, password }`
- `POST /api/auth/login` with `{ email, password }`
- `GET /api/auth/google` and `GET /api/auth/google/callback`
- `POST /api/auth/verify-email` with `{ token }`
- `POST /api/auth/resend-verification` with `{ email }`
- `POST /api/auth/refresh` with `{ refreshToken }`
- `POST /api/auth/logout` with `{ refreshToken }`
- `POST /api/auth/forgot-password` with `{ email }`
- `POST /api/auth/reset-password` with `{ token, password }`
- `GET /api/auth/me`

### AI

- `POST /api/chat` with `{ system, text, maxTokens }`
- Gemini calls are made only by Express.
- Redis/Valkey caches exact prompts when configured.
- Requests are rate limited, bounded by a timeout, retried for temporary failures, and persisted to PostgreSQL chat sessions when authenticated.

### Notifications

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `DELETE /api/notifications/:id`
- `POST /api/notifications/push-subscription`

## Production Deployment

1. Provision managed PostgreSQL and run `server/schema.sql`.
2. Provision Redis/Valkey if caching and distributed reminder locking are needed.
3. Set server secrets through the deployment platform, never in source control.
4. Set `ALLOWED_ORIGIN` and `APP_URL` to the HTTPS frontend origin.
5. Configure Google OAuth redirect URI as `https://api.example.com/api/auth/google/callback`.
6. Configure SMTP and VAPID keys if email or browser push is enabled.
7. Run the API with `npm start` from `server/` and build the frontend with `npm run build`.
8. Serve `dist/` behind HTTPS and a reverse proxy. Scale API instances horizontally; Redis locking prevents duplicate scheduled reminders.

## Dependency Changes

Removed:

- `firebase`
- `mongoose`
- `otp-generator`

Added:

- `pg`
- `helmet`
- `express-rate-limit`
- `google-auth-library`
- `web-push`

Retained:

- `ioredis` for optional Redis/Valkey integration
- `bcryptjs`, `jsonwebtoken`, `nodemailer`, `express`, and `cors`

## Verification Checklist

- [ ] Run PostgreSQL and apply `server/schema.sql`.
- [ ] Set `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY`.
- [ ] Register and log in with email/password.
- [ ] Verify refresh-token rotation and logout revocation.
- [ ] Configure and test Google OAuth callback.
- [ ] Send a question in every AI mode.
- [ ] Confirm AI keys are absent from the frontend bundle and network request body.
- [ ] Configure Redis and verify cache hits and reminder locking.
- [ ] Open the notification bell, mark notifications read, and delete one.
- [ ] Configure VAPID keys and test browser push on HTTPS or localhost.
- [ ] Test reminder delivery with a study session starting ten minutes ahead.
- [ ] Run `npm run build`, `npm run lint`, and `node --check server/server.js`.
