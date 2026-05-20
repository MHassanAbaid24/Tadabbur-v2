<div align="center">

# تدبّر · Tadabbur

**Read. Reflect. Grow Together.**

*A daily Quranic reflection companion powered by the Quran Foundation APIs*

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

</div>

---

## Demo

[![Tadabbur Demo](https://img.youtube.com/vi/I6bEkRtNIgs/maxresdefault.jpg)](https://youtu.be/I6bEkRtNIgs?si=D_B_95c0yKUhjb4A)

---

## What is Tadabbur?

Tadabbur is a **Progressive Web App** that gives every user the same daily Quranic verse, invites a personal reflection, and lets families and friends grow together in private *Circles*. It integrates deeply with the **Quran Foundation** platform — content is served via the Content API and user progress, notes, and social posts sync back to a user's QF account via the User API.

---

## Features

| | |
|---|---|
| 📖 **Daily Verse** | A fresh deterministic verse every UTC day, shared community-wide |
| 🎧 **Audio Recitation** | Mishary Al-Afasy audio streamed from `verses.quran.com` |
| 📜 **Tafsir** | Ibn Kathir English tafsir in a slide-up drawer |
| 🔍 **Explore** | Full surah/verse browser powered by the Content API |
| ✍️ **Reflections** | Guided two-prompt journalling with mood tags and history |
| 🤖 **AI Insight** | Claude Haiku (via OpenRouter) generates actionable takeaways |
| 👥 **Circles** | Private groups with a shared feed, likes, and QF room sync |
| 📈 **Progress** | XP, 5 named levels, streaks, and a GitHub-style activity heatmap |
| 🔔 **Reminders** | Timezone-aware email reminders with the day's verse snippet |
| 🔗 **QF Account Link** | Optional OAuth to sync notes, streaks, and posts to quran.com |

---

## Quran Foundation API Integration

> All QF API calls are made **server-side** from the FastAPI backend. The React frontend never calls `api.quran.com` directly — it only talks to `/api/*` on the FastAPI server, which holds the QF credentials and proxies all Quran data.

### Content APIs Used

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `GET /content/api/v4/verses/by_key/{verse_key}` | Fetch Uthmani Arabic text + English translation (Abdel Haleem, ID 85) for any verse |
| 2 | `GET /content/api/v4/tafsirs/169/by_ayah/{verse_key}` | Fetch Ibn Kathir English tafsir (ID 169) for the displayed verse |
| 3 | `GET /content/api/v4/recitations/7/by_ayah/{verse_key}` | Fetch Mishary Al-Afasy (ID 7) recitation audio path |
| 4 | `GET /content/api/v4/chapters` | List all 114 surah names and metadata for the Explore page |
| 5 | `GET /content/api/v4/verses/by_chapter/{chapter_number}` | List all verses in a surah for the verse browser |

Auth: `x-auth-token` (client-credentials token) + `x-client-id` header. Environment toggled between prelive and production via `QF_ENV`.

### User APIs Used

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `POST /api/v1/reading-sessions` | Log that the user read a verse (called on verse load and reflection submit) |
| 2 | `POST /api/v1/notes` | Sync submitted reflection as a QF note tagged `tadabbur` |
| 3 | `POST /api/v1/activity-days` | Record the day as an active reflection day |
| 4 | `GET /api/v1/activity-days?from=&to=` | Fetch activity dates to merge into the local progress heatmap |
| 5 | `GET /api/v1/streaks` | Retrieve current and longest streak for XP bonus calculation |
| 6 | `POST /api/v1/posts` | Share a reflection to the user's QF room (when Circle post is toggled on) |
| 7 | `POST /api/v1/posts/{id}/like` | Like a shared reflection in the Circle feed |
| 8 | `DELETE /api/v1/posts/{id}/like` | Remove a like from a shared reflection |
| 9 | `POST /api/v1/rooms/groups` | Create a QF-backed room when a new Tadabbur Circle is created |

Auth: `Authorization: Bearer {user_qf_access_token}` obtained via OAuth2 authorization code flow (`scope: streak activity_day note room post goal reading_session`).

### How It Fits Together

```
React PWA  ──axios──►  FastAPI  ──x-auth-token──►  QF Content API v4
                           │
                           ├──Bearer token──►  QF User API v1
                           │
                           └──PostgREST──►  Supabase (PostgreSQL)
```

1. **On page load** — backend calls `verses/by_key` + `recitations` + `tafsirs` in parallel (5-minute cache) and logs a `reading-session` to QF.
2. **On reflection submit** — backend stores the reflection locally in Supabase, then fires `notes`, `activity-days`, and optionally `posts` to QF in the background.
3. **On Progress page** — backend merges local Supabase activity with `activity-days` from QF so the heatmap reflects data from both sources.
4. **On Circle create** — backend calls `rooms/groups` to create a matching QF room, so Circle posts also appear on the user's quran.com social feed.

---

## Quick Start

### Prerequisites
- Node 20+ · Python 3.12+ · Supabase project · QF Developer credentials

### 1. Clone & install

```bash
git clone https://github.com/MHassanAbaid24/Tadabbur-v2.git
cd Tadabbur-v2
npm install          # root workspace scripts
cd frontend && npm install
cd ../backend && pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in: QF_CLIENT_ID, QF_CLIENT_SECRET, QF_ENV,
#          SUPABASE_URL, SUPABASE_SERVICE_KEY,
#          OPENROUTER_API_KEY, FRONTEND_URL
```

### 3. Run database migrations

Apply `/backend/db/schema.sql` and all files in `/backend/migrations/` to your Supabase project.

### 4. Start development servers

```bash
npm run dev          # starts Vite (:5173) + FastAPI (:8000) concurrently
```

### 5. Other scripts

```bash
npm run test         # Vitest + Pytest
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
```

---

## Project Structure

```
Tadabbur/
├── frontend/                  # React 18 + Vite PWA
│   └── src/
│       ├── pages/             # Home, Explore, Progress, Circle, Onboarding …
│       ├── components/        # VerseCard, AudioPlayer, TafsirDrawer, ReflectionForm …
│       └── store/             # Zustand stores (verse, auth, circle, progress)
├── backend/                   # FastAPI
│   └── app/
│       ├── auth/              # qf_token.py, qf_user_auth.py (OAuth flows)
│       ├── services/          # qf_content.py, qf_user.py, ai_prompts.py, reminder_scheduler.py
│       └── routers/           # verse, tafsir, audio, reflection, circle, progress, auth
├── docs/                      # DEPLOYMENT.md, SUPABASE_SETUP.md, api-usage.md
└── .env.example
```

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, Zustand, Framer Motion |
| PWA | vite-plugin-pwa + Workbox |
| Backend | Python 3.12, FastAPI, httpx, APScheduler |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | OpenRouter → Claude Haiku |
| Quran Data | Quran Foundation Content API v4 + User API v1 |
| Audio CDN | verses.quran.com |

---

<div align="center">

Built with ❤️ for the **Quran Foundation Hackathon**

</div>
