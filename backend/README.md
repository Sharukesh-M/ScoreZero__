# ScoreZero Backend — Node.js + Express

Production-ready REST API for ScoreZero's behavioral credit scoring platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Auth | Supabase Auth (JWT) |
| Database | Supabase PostgreSQL |
| PDF Parsing | `pdf-parse` + Google Cloud Vision (optional) |
| AI Recommendations | Groq API (Mixtral-8x7b-32768) |
| Validation | Zod |

## Key Design Principles

- **Zero PDF Storage** — PDFs are processed entirely in memory and immediately discarded. Only scores and recommendations are persisted.
- **Async Processing** — Upload returns `202 Accepted` instantly. Frontend polls `/statements/:id/status`.
- **Graceful Degradation** — Groq AI has a 4s timeout; falls back to rule-based recommendations automatically.
- **No Google Vision Required** — `pdf-parse` handles digital PDFs without GCP credentials.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values (Supabase, Groq, optional GCP)
npm run dev
```

The server starts on **http://localhost:4000**.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role (server-only) |
| `SUPABASE_JWT_SECRET` | ✅ | From Supabase dashboard → Settings → API |
| `GROQ_API_KEY` | ⚠️ | Groq API key — falls back to rules if missing |
| `GOOGLE_APPLICATION_CREDENTIALS` | ℹ️ | Path to GCP JSON — only needed for scanned PDFs |
| `PORT` | — | Default: `4000` |
| `GROQ_TIMEOUT_MS` | — | Default: `4000` (4 seconds) |
| `MAX_UPLOAD_SIZE_MB` | — | Default: `15` |

## API Reference

### Auth
```
POST /auth/signup      { email, password, name? }
POST /auth/login       { email, password }
POST /auth/refresh     { refresh_token }
POST /auth/logout      (Authorization: Bearer <token>)
GET  /auth/me          (Authorization: Bearer <token>)
```

### Statements
```
POST /statements/upload          multipart/form-data { pdf: File, optional_password? }
GET  /statements/:uploadId/status
GET  /statements
DELETE /statements/:uploadId
```

### Scores
```
GET  /scores/latest
GET  /scores/history             ?limit=10&offset=0
GET  /scores/:scoreId
POST /scores/:uploadId/report
```

### Health
```
GET  /health
```

## Processing Pipeline

```
POST /statements/upload
  │
  ├─ multer memory storage (no disk write)
  ├─ create upload record (status: 'processing')
  ├─ return 202 immediately
  │
  └─ setImmediate → processUpload()
       │
       ├─ 1. pdf-parse → extract text
       ├─ 2. (if sparse text + GCP configured) → Google Vision OCR
       ├─ 3. categorise transactions
       ├─ 4. calculate 5 metrics + score
       ├─ 5. Groq AI recommendations (4s timeout → fallback)
       ├─ 6. upsert scores + recommendations in Supabase
       └─ 7. update upload status → 'completed' | 'low_confidence' | 'failed'

GET /statements/:uploadId/status
  └─ poll every 2s until status !== 'processing'
```

## Database Schema

Run `supabase_schema.sql` in your Supabase SQL Editor before starting.

## Score Calculation

| Metric | Weight | Formula |
|---|---|---|
| Income Regularity | 30% | Income event count → 0/30/60/85/100 |
| Savings Ratio | 25% | `(income - spend) / income × 100` → scaled 0-100 |
| Spending Discipline | 20% | `discretionary / income` — ≤15% → 100, ≥50% → 0 |
| Bounce Frequency | 15% | `max(0, 100 - bounces × 20)` |
| Balance Trend | 10% | end > start → 100, end < start → 20, else 50 |

Score Bands: Poor (0-39) · Fair (40-54) · Good (55-69) · Very Good (70-84) · Excellent (85-100)
