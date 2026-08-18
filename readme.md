# LOOP — AI Customer-Feedback Intelligence Platform

LOOP ingests multi-channel customer feedback and turns it into themes, sentiment, trends, and grounded answers — built as a corporate-grade internship project for Zidio Development.

**Live app:** https://loop-mern.vercel.app
**Live API:**  https://loop-mern.onrender.com
**Repo:** https://github.com/Shahnawaz1926/loop-mern

---

## Demo credentials

All accounts are on the same seeded demo workspace ("Acme SaaS Co."), password for all: `Password123!`

| Role | Email |
|---|---|
| Admin | `admin@acme.test` |
| Analyst | `analyst@acme.test` |
| Viewer | `viewer@acme.test` |

---

## Tech stack

This project uses an approved alternative stack (MERN) in place of the default Next.js/Prisma stack, agreed with the assigned mentor.

- **Frontend:** React (Vite) + Tailwind CSS + React Router
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas + Mongoose
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **AI:** Google Gemini API (`gemini-2.5-flash` for generation/classification, `gemini-embedding-001` for embeddings) — used in place of Claude, agreed with mentor due to free-tier availability
- **Charts:** Recharts
- **Deployment:** Vercel (frontend) + Render (backend) + MongoDB Atlas (database)

---

## Architecture summary

Three-tier architecture: the React frontend never talks to MongoDB or Gemini directly — every request goes through the Express API layer, which authenticates the session, checks the caller's role, and scopes every database query to the caller's `workspaceId`.

```
client/ (React + Vite)
  → calls →
server/ (Express API)
  - authMiddleware.js   verifies JWT, attaches { userId, workspaceId, role } to req.user
  - roleMiddleware.js   blocks routes by role (requireRole('ADMIN', 'ANALYST'))
  - every controller filters queries by req.user.workspaceId
  → talks to →
MongoDB Atlas (Mongoose models: Workspace, User, Feedback, Theme, Report)
  and
Gemini API (classification, embeddings, grounded Q&A, report narrative generation)
```

**Tenant isolation:** every Feedback, Theme, and Report document carries a `workspaceId` field. Every single query in every controller filters on `req.user.workspaceId`, which comes from the verified JWT — never from a client-supplied parameter. This was directly tested: an Analyst-role token cannot create feedback (403), and cross-workspace document access via forged IDs is blocked by including `workspaceId` in the `findOne` filter itself, not just checking after the fact.

---

## Features

**Core**
- Multi-tenant workspaces with 3 roles (Admin, Analyst, Viewer), enforced server-side
- Feedback ingestion: single entry, CSV bulk upload (with per-row validation and error reporting), simulated channel import
- Feedback inbox: search, filters (channel/sentiment/status), pagination, inline status workflow (NEW → REVIEWED → ACTIONED)
- Analytics dashboard: volume-over-time chart, sentiment breakdown, top themes, stat cards

**AI (Gemini-powered)**
- Auto-classification on ingest: sentiment, sentiment score, theme(s), feature area — structured JSON, validated, stored (not recomputed per view). Manual re-classify endpoint included.
- Theme clustering & trends: themes with counts, 14-day-period spike detection, drill-down into underlying feedback
- Ask LOOP: retrieval-grounded Q&A — embeds all feedback, embeds the question, retrieves top-8 most similar items via cosine similarity, and has Gemini answer strictly from those items with inline citations `[1] [2]`
- Voice-of-Customer report: stats (totals, sentiment split, top themes, verbatim quotes) are computed in code first, then Gemini writes the narrative around those real numbers — this prevents hallucinated statistics. Reports are saved, listable, viewable, and exportable via browser print-to-PDF.

---

## Local setup

### Prerequisites
- Node.js 18+
- A MongoDB Atlas account (free tier)
- A Google AI Studio account for a Gemini API key (free, no card required)

### 1. Clone and install
```bash
git clone https://github.com/Shahnawaz1926/loop-mern.git
cd loop-mern

cd server
npm install

cd ../client
npm install
```

### 2. Environment variables

**`server/.env`:**
```
MONGO_URI=your-mongodb-atlas-connection-string
JWT_SECRET=any-long-random-string
PORT=5000
GEMINI_API_KEY=your-gemini-api-key
CLIENT_URL=http://localhost:5173
```

**`client/.env`:**
```
VITE_API_URL=http://localhost:5000
```

### 3. Seed the database
```bash
cd server
npm run seed
```
This creates one demo workspace, 3 users (one per role, password `Password123!`), 6 themes, and 120 feedback items across 5 channels.

### 4. Run locally
```bash
# terminal 1
cd server
npm run dev

# terminal 2
cd client
npm run dev
```
Visit `http://localhost:5173`.

### 5. (Optional) Backfill AI classification / embeddings on seeded data
The seed script does not call the AI itself (keeps seeding instant and free). After seeding, log in as Admin and trigger:
- `POST /api/feedback/backfill-classify` — classifies all unclassified items in batches
- `POST /api/feedback/backfill-embeddings` — embeds items for Ask LOOP (processes 40 at a time due to free-tier rate limits; call repeatedly if you have more items)

---

## API overview

All routes are prefixed with the base URL. Protected routes require `Authorization: Bearer <token>`.

| Method | Route | Role required | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Create workspace + admin user |
| POST | `/api/auth/login` | — | Log in, get JWT |
| GET | `/api/workspace/members` | any | List workspace members |
| POST | `/api/workspace/members` | Admin | Add a member |
| PATCH | `/api/workspace/members/:id/role` | Admin | Change a member's role |
| GET | `/api/feedback` | any | List feedback (paginated, filterable) |
| POST | `/api/feedback` | Admin, Analyst | Create feedback item |
| PATCH | `/api/feedback/:id/status` | Admin, Analyst | Update status |
| POST | `/api/feedback/upload` | Admin, Analyst | CSV bulk import |
| POST | `/api/feedback/simulate/:channel` | Admin, Analyst | Seed simulated channel items |
| POST | `/api/feedback/:id/reclassify` | Admin, Analyst | Re-run AI classification |
| POST | `/api/feedback/backfill-classify` | Admin | Batch-classify unclassified items |
| POST | `/api/feedback/backfill-embeddings` | Admin | Embed items for Ask LOOP |
| POST | `/api/feedback/ask` | any | Ask LOOP — grounded Q&A |
| GET | `/api/themes` | any | List themes with counts |
| GET | `/api/themes/trends` | any | Trend + spike detection |
| GET | `/api/themes/:id/feedback` | any | Drill down into a theme |
| GET | `/api/analytics/summary` | any | Dashboard chart data |
| POST | `/api/reports/generate` | Admin, Analyst | Generate a VoC report |
| GET | `/api/reports` | any | List past reports |
| GET | `/api/reports/:id` | any | View a report |

---

## Notes on the stack deviation

Per the original brief (Next.js 14 + TypeScript + PostgreSQL + Prisma + Anthropic Claude), two substitutions were made with mentor approval:

1. **MERN instead of Next.js/Prisma/PostgreSQL** — the brief explicitly allows a Java Full-Stack alternative; the mentor extended the same flexibility for MERN given prior React/JavaScript background. All functional requirements, milestones, and the security model (tenant isolation, RBAC) were implemented identically to the spec — only the implementation technology changed.
2. **Google Gemini instead of Anthropic Claude** — used for all four AI features (classification, clustering support, Ask LOOP, report generation) due to free-tier availability without a payment method. All AI feature requirements (structured JSON output, retrieval-grounded answers with citations, non-hallucinated report statistics) were implemented to the same standard specified in the brief.
