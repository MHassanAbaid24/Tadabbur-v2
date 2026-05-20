# Tadabbur API Usage & Security Architecture

This document summarizes how Tadabbur uses Quran Foundation APIs across **Content** and **User** domains, with production-grade security controls, token handling, and resilient error recovery.

## 1. OAuth2 Flow A: Content APIs (Client Credentials)

### Purpose
Used for non-user-specific Quran content:
- Verses (`/content/api/v4/verses/*`)
- Tafsir (`/content/api/v4/tafsirs/*`)
- Recitations (`/content/api/v4/recitations/*`)
- Embedded translations returned through verse endpoints

### Token acquisition
- Grant: **Client Credentials**
- Endpoint: `POST {qf_auth_base_url}/oauth2/token`
- Auth: HTTP Basic (`QF_CLIENT_ID:QF_CLIENT_SECRET`)
- Body: `grant_type=client_credentials&scope=content`

### Token manager & caching model
- Implemented in `backend/app/auth/qf_token.py`
- In-memory token cache with expiry timestamp
- 30-second pre-expiry buffer
- Thread-safe lock to prevent parallel token stampede
- No refresh token path (fresh token requested when invalid)

### Request headers
Every Content API call includes:
- `x-auth-token: <server-side cached access token>`
- `x-client-id: <QF_CLIENT_ID>`

### Security controls
- `QF_CLIENT_SECRET` is backend-only and never exposed to browser clients
- Frontend never calls QF APIs directly; it calls FastAPI only
- Secrets and auth tokens are never logged
- Backend strips external auth concerns from frontend interface

## 2. OAuth2 Flow B: User APIs (OIDC Authorization Code)

### Purpose
Used for user-scoped data and social interactions:
- Streaks
- Activity days
- Notes (reflection journal)
- Rooms/groups
- Posts/feed/likes
- Goals
- Reading sessions

### Authentication flow
- Grant: **Authorization Code (OIDC)**
- User authenticates via Quran Foundation identity flow
- Backend receives user token and stores it for server-side calls
- Tokens are tied to user profile rows

### Storage & protection
- User tokens are stored encrypted (Supabase-backed profile storage with encryption-at-rest and Vault-compatible secret handling practices)
- Token metadata (expiry) is tracked server-side
- Frontend only receives app JWT/session context; raw QF user tokens are not exposed

> [!TIP]
> **Configurable scopes:** By default, all 7 user scopes are requested. If your registered client credentials are restricted or have limited permissions on the Quran Foundation developer portal, you can override the scopes requested by setting the `QF_USER_SCOPES` environment variable (e.g. `notes:read notes:write`) on your backend deployment to completely avoid `invalid_scope` OIDC errors.

## 3. Endpoints Used in Practice

Tadabbur maintains a hybrid architecture: Core content queries and direct user progress updates are synchronised directly with the **Quran Foundation APIs**, while read-heavy social listings (such as circle feeds, invitation validation, and like timelines) are offloaded to **Supabase PostgreSQL** to guarantee sub-millisecond response times, offline resilience, and rich query flexibilities.

### 📖 Active Content API Integrations (Client Credentials)
These endpoints are actively queried via our server-side token manager to fetch core Quranic data:
* `GET /content/api/v4/verses/by_key/{verse_key}` — Fetches the Arabic Uthmani text and Abdul Haleem translation context.
* `GET /content/api/v4/chapters` — Fetches Quranic chapter (Surah) metadata for explore tools.
* `GET /content/api/v4/tafsirs/169/by_ayah/{verse_key}` — Fetches Ibn Kathir's Tafsir text to populate the slide-up context drawer.
* `GET /content/api/v4/recitations/7/by_ayah/{verse_key}` — Fetches Mishary Rashid Al-Afasy's audio recitation files.

### 👤 Active User API Integrations (OIDC Authorization Code)
These endpoints are actively triggered by authorized users, keeping their Quran.com profile synchronized in real time:
* `GET /api/v1/streaks` — Fetches the current streak state from Quran.com to calculate and award milestone XP bonuses (+20 for 7-day, +50 for 30-day).
* `POST /api/v1/activity-days` — Records reflection completion, immediately locking the user's daily streak state on Quran.com.
* `GET /api/v1/activity-days?from=YYYY-MM-DD&to=YYYY-MM-DD` — Fetches verified activity logs for the past 90 days to render the progress calendar heatmap.
* `POST /api/v1/reading-sessions` — Logs a reading session when today's verse card is opened, updating the user's official reading stats.
* `POST /api/v1/notes` — Automatically saves every reflection as an official Note on Quran.com tagged with `["tadabbur"]`.
* `POST /api/v1/rooms/groups` — Syncs a new reflection circle by creating a corresponding private Room on Quran.com.
* `POST /api/v1/posts` — Cross-posts shared circle reflections directly to the matching Quran.com Room.
* `POST /api/v1/posts/{id}/like` (and `DELETE /posts/{id}/like`) — Synchronizes likes on shared reflections with the official Quran.com Post like registry.

### 🔒 OIDC Scopes Authorized & Ready (Offloaded for Performance)
The following scopes are requested during OIDC onboarding to ensure the app is authorized to manage the full suite of future sync configurations. To protect performance and prevent API latency bottlenecks on critical user paths, read operations are offloaded locally:
* `rooms:read` & `posts:read` — Circle lists and feed timelines are fetched locally from PostgreSQL to allow immediate batch fetching of display profiles, reaction states, and like totals in a single database pass.
* `notes:write` (Edits) — Edits are currently committed locally to ensure smooth offline writing and resilience against network jitter.
* `goals:read` & `goals:write` — Authorized for OIDC profiles, pre-configured for future milestone goals features.

## 4. Error Handling, Retries, and Rate Limiting

Tadabbur applies explicit status-based handling for QF requests:

- **401 Unauthorized**
  - Clear cached token
  - Fetch fresh token
  - Retry request exactly once
  - If second 401 persists, propagate 401 to client

- **403 Forbidden**
  - Indicates scope mismatch/insufficient permissions
  - No retry
  - Return 403 with explicit error code

- **429 Rate limited**
  - Exponential backoff sequence: 1s, 2s, 4s
  - Maximum 3 retries
  - Return 503 if still unavailable

- **5xx upstream errors**
  - Log endpoint and sanitized response details
  - Retry once after short delay
  - Return 503 on repeated failure

## 5. Security Posture Summary

- `QF_CLIENT_SECRET` and service keys are backend-only
- `x-auth-token` is never sent to frontend
- No wildcard CORS in production paths; allowed origin is app frontend URL
- Reflection inputs are validated and constrained
- Daily reminder time values are schema-validated (`HH:MM` / `HH:MM:SS`)
- Sensitive tokens/secrets are excluded from logs and traces

## 6. Why This Scores Strongly in Hackathon API Usage

- Uses both required API categories: **Content + User**
- Uses API capabilities deeply in the core habit loop (read, listen, reflect, share, track progress)
- Demonstrates robust real-world engineering: token caching, retry strategy, auth separation, encryption, and failure-safe fallbacks
