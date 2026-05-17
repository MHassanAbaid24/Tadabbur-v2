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

## 3. Endpoints Used in Practice

## Content APIs
- `GET /content/api/v4/verses/by_key/{verse_key}`
- `GET /content/api/v4/verses/random`
- `GET /content/api/v4/chapters`
- `GET /content/api/v4/tafsirs/169/by_ayah/{verse_key}`
- `GET /content/api/v4/recitations/7/by_ayah/{verse_key}`

## User APIs
- `GET /api/v1/streaks`
- `POST /api/v1/activity-days`
- `GET /api/v1/activity-days`
- `POST /api/v1/reading-sessions`
- `POST /api/v1/notes`
- `GET /api/v1/notes`
- `PUT /api/v1/notes/{id}`
- `POST /api/v1/rooms/groups`
- `GET /api/v1/rooms`
- `GET /api/v1/rooms/{id}/members`
- `POST /api/v1/rooms/{id}/invite`
- `POST /api/v1/posts`
- `GET /api/v1/posts/feed`
- `POST /api/v1/posts/{id}/like`
- `POST /api/v1/goals`
- `GET /api/v1/goals/today`

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
