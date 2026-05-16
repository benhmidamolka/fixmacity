# FixMaCity backend — API overview

Base URL: `http://localhost:5005` (or your `PORT`).

## Mounted routes (`src/app.js`)

| Prefix | Router |
|--------|--------|
| `/api/auth` | `auth.routes` (+ rate limiter on this mount) |
| `/api/declarations` | `declarations.routes` |
| `/api/president` | `president.routes` |
| `/api/chef` | `chef.routes` |
| `/api/agent` | `agent.routes` |
| `/api/chatbot` | `chatbot.routes` |
| `/api/notifications` | `notifications.routes` |
| `/api/propositions` | `propositions.routes` |

Health: `GET /api/health` (no auth).

## Declarations (`/api/declarations`)

All routes require JWT unless noted.

| Method | Path | Who | Description |
|--------|------|-----|-------------|
| POST | `/` | citizen | Create declaration |
| GET | `/mine` | citizen | List my declarations |
| GET | `/map` | citizen | Map view |
| GET | `/nearby` | citizen | Proximity RPC (`lat`, `lng`, `category` query params) |
| **GET** | **`/:id`** | **citizen, agent, chef, president** | **Single declaration with photos, comments, status history, ratings** (citizen: own only; staff: raw `status` enum) |
| PUT | `/:id` | citizen | Edit while `soumise` |
| DELETE | `/:id` | citizen | Soft delete while `soumise` |
| POST | `/:id/vote` | citizen | Upvote another citizen’s declaration |
| POST | `/:id/rate` | citizen | Rate after résolution |

Place static paths (`/mine`, `/map`, `/nearby`) before `/:id` in the router so they are not captured as IDs.

## Environment

See `.env.example` for `JWT_SECRET`, Supabase, Cloudinary, Gemini, CORS, and **email** (`EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`) used by `email.service.js`.
