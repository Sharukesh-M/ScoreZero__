<div align="center">

# ⚡ ScoreZero

### Alternative Credit Intelligence — Behavioral Credit Scoring from Bank Statements

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com)
[![Groq AI](https://img.shields.io/badge/Groq-Mixtral--8x7b-FF6B35.svg)](https://groq.com)

**ScoreZero** turns any Indian bank statement PDF into a real-time, AI-powered credit score — no CIBIL bureau needed.  
**Upload → Analyse → Score → AI Action Plan.** Done in seconds.

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Secure PDF Ingestion** | AES-256 encrypted upload; PDFs processed entirely in-memory — never written to disk |
| 🔍 **AI Statement Analysis** | Detects circular transfers, bounce charges, NSF fees, metadata tampering & anomalous spending |
| 📊 **0–100 Behavioral Score** | Five-metric scoring engine across Income, Savings, Discipline, Bounce & Balance |
| 🤖 **Gemini AI Advisory** | Personalised credit action plan with step-by-step improvement targets |
| 🏦 **Loan Readiness Assessment** | Deterministic rule-based lender eligibility check with recommended loan amount & interest range |
| 📈 **Score History & Analytics** | Full timeline of past scores, cashflow breakdowns, and spending heatmaps |
| 💬 **Interactive AI Chat** | Ask any question about your statement — powered by Gemini multimodal reasoning |
| 🏦 **Multi-bank Support** | HDFC, SBI, ICICI, Axis, PhonePe, Google Pay, and more |
| 🌗 **Dark / Light Mode** | Neumorphic dashboard with full theme toggle |
| ⚡ **Real-time Polling** | Async pipeline — upload returns 202 instantly, score delivered via 2s poll |
| 🔒 **Supabase Auth** | Google OAuth + Email/Password via Supabase JWT |

---

## 🏗️ Architecture

```
scorezero_final/
├── backend/                  # Node.js + Express REST API  →  port 4000
│   ├── app/
│   │   ├── config.py         # Environment & Supabase config
│   │   ├── middleware/       # JWT auth middleware
│   │   ├── routes/           # auth · statements · scores · uploads
│   │   └── services/         # PDF parsing · scoring engine · Groq/Gemini AI
│   ├── .env.example          # Environment variable template
│   ├── package.json
│   ├── requirements.txt
│   ├── run.py                # Entry point
│   └── supabase_schema.sql   # Run this in Supabase SQL Editor first
│
└── frontend copy/            # React 18 + Vite + TypeScript  →  port 5173
    ├── public/               # Static assets (img1–4.png, favicon, icons)
    └── src/
        ├── api/              # nodeApiClient — fully typed API calls
        ├── components/
        │   ├── dashboard/    # Neumorphic dashboard (ScoreZeroDashboard, TopNavBar…)
        │   └── ...           # Landing page (ScrollHero, ScoreZeroModules…)
        ├── context/          # AuthContext (Supabase session)
        └── App.tsx           # Root — landing ↔ dashboard switcher
```

---

## 🔄 Processing Pipeline

```
POST /statements/upload
  │
  ├─ multer memory storage  (zero disk write)
  ├─ create upload record → status: 'processing'
  ├─ return 202 immediately
  │
  └─ async → processUpload()
       ├─ 001  pdf-parse  → extract raw text
       ├─ 002  Categorise & tag every transaction
       ├─ 003  Calculate 5 weighted metrics → ScoreZero 0–100
       ├─ 004  Groq/Gemini AI recommendations  (4s timeout → rule-based fallback)
       ├─ 005  Upsert scores in Supabase
       └─ 006  status → 'completed' | 'low_confidence' | 'failed'
```

---

## 📊 Score Calculation

| Metric | Weight | Formula |
|--------|--------|---------|
| Income Regularity | **30%** | Income event count → tiered 0 / 30 / 60 / 85 / 100 |
| Savings Ratio | **25%** | `(income − spend) / income × 100`, scaled 0–100 |
| Spending Discipline | **20%** | Discretionary / income — ≤ 15% → 100, ≥ 50% → 0 |
| Bounce Frequency | **15%** | `max(0, 100 − bounces × 20)` |
| Balance Trend | **10%** | end > start → 100 · end < start → 20 · flat → 50 |

**Score Bands:**  
`Poor` (0–39) · `Fair` (40–54) · `Good` (55–69) · `Very Good` (70–84) · `Excellent` (85–100)

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **Supabase** project — [supabase.com](https://supabase.com) (free tier works)
- **Groq API key** (free) — [console.groq.com](https://console.groq.com)

---

### 1. Clone

```bash
git clone https://github.com/Sharukesh-M/ScoreZero__.git
cd ScoreZero__
```

---

### 2. Backend

```bash
cd backend

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and fill in: SUPABASE_URL, SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, GROQ_API_KEY
```

**Set up the database** — run `supabase_schema.sql` in your Supabase project → SQL Editor.

```bash
# Start the backend
python run.py
# → Running on http://localhost:4000
```

---

### 3. Frontend

```bash
cd "frontend copy"

npm install
npm run dev
# → Running on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) — sign up, upload a bank statement PDF, and get your score.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase publishable anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-only) |
| `SUPABASE_JWT_SECRET` | ✅ | Supabase → Settings → API → JWT Secret |
| `GROQ_API_KEY` | ⚠️ | Groq API key — falls back to rule-based recommendations if absent |
| `GOOGLE_APPLICATION_CREDENTIALS` | ℹ️ | Path to GCP JSON — only needed for scanned/image PDFs |
| `PORT` | — | Default: `4000` |
| `GROQ_TIMEOUT_MS` | — | Default: `4000` ms |
| `MAX_UPLOAD_SIZE_MB` | — | Default: `15` MB |

---

## 📡 API Reference

### Auth
```
POST /auth/signup      { email, password, name? }
POST /auth/login       { email, password }
POST /auth/refresh     { refresh_token }
POST /auth/logout      Authorization: Bearer <token>
GET  /auth/me          Authorization: Bearer <token>
```

### Statements
```
POST   /statements/upload            multipart { pdf: File, optional_password? }
GET    /statements/:uploadId/status
GET    /statements
DELETE /statements/:uploadId
```

### Scores
```
GET  /scores/latest
GET  /scores/history    ?limit=10&offset=0
GET  /scores/:scoreId
POST /scores/:uploadId/report
```

### Health
```
GET /health
```

---

## 🛠️ Tech Stack

**Backend**

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Auth | Supabase Auth (JWT) |
| Database | Supabase (PostgreSQL) |
| PDF Parsing | `pdf-parse` + optional Google Cloud Vision |
| AI Engine | Groq API (Mixtral-8x7b) / Gemini AI |
| Validation | Zod |

**Frontend**

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Styling | Vanilla CSS + Neumorphism design system |
| Animation | Framer Motion + Lenis smooth scroll |
| Auth | Supabase Auth |
| Icons | Lucide React |

---

## 🔒 Privacy & Security

- ✅ PDFs are **never stored on disk** — processed entirely in RAM, then discarded
- ✅ All API routes protected with Supabase JWT verification
- ✅ No transaction data is sold or shared with any third party
- ✅ Users can delete all their data at any time via **"Delete My Data"**

---

## 🤝 Credits

| Contributor | Role |
|-------------|------|
| **Sharukesh M** | Full-Stack Development, AI Integration, System Architecture |

**Built with open source:**  
React · Vite · Supabase · Framer Motion · Lenis · Lucide React · Groq · pdf-parse · Express.js · Zod

---

## 📄 License

MIT © 2025 Sharukesh M

---

<div align="center">
  <strong>ScoreZero</strong> — Alternative Credit Intelligence<br/>
  <em>Not an official credit bureau score.</em>
</div>
