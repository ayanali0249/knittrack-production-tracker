# KnitTrack — Production Order-Tracking System
## Deployment & Operational Runbook

**Company:** Isocode Labs Take-Home Assessment  
**Role:** Software Engineering Intern  
**Submission Date:** November 2026  
**Client Context:** Knitwear Apparel Exporter, Tiruppur, Tamil Nadu, India  

---

## 1. Project Overview & Architecture

KnitTrack is a high-reliability production order tracking platform designed specifically for the knitwear garment export industry in Tiruppur, Tamil Nadu. It provides end-to-end milestone visibility across cutting, stitching, printing, washing, finishing, and packing stages.

### Technical Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios, React Router v6
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL (with relations, constraints, and audit logs)
- **Authentication:** JWT in secure HttpOnly cookies, bcryptjs password hashing, server-side RBAC
- **AI Automation:** Google Gemini 1.5 / 2.0 Flash with deterministic Tamil/English rule-based fallback
- **Testing:** Vitest, Supertest, React Testing Library

---

## 2. Prerequisites & Required Software

Ensure the following tools are installed on the deployment or development host:
- **Node.js:** v18.0.0 or higher (v20+ recommended; verified on Node v24)
- **npm:** v9.0.0 or higher
- **PostgreSQL:** v14 or higher (or cloud database such as Neon, Supabase, Railway Postgres, or Render Postgres)
- **Git:** v2.30+

---

## 3. Environment Variables Specification

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and configure the following parameters:

```env
# Database Connection URL (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/knittrack?schema=public"

# Authentication Secrets
JWT_SECRET="knittrack-secure-production-jwt-secret-min-32-chars-key-2026"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=3001
NODE_ENV="development"

# CORS Origin Allowed
FRONTEND_URL="http://localhost:5173"

# Google Gemini AI Integration (Tamil & English note classification)
# Obtain a free API key at: https://aistudio.google.com/
GEMINI_API_KEY=""

# File Upload Configuration
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=5
```

> **Note on AI Fallback:** If `GEMINI_API_KEY` is not provided, KnitTrack automatically activates its rule-based keyword classifier for Tamil ("மெஷின் பழுதாகிவிட்டது", "தொழிலாளர்கள் குறைவாக உள்ளனர்", "துணி இன்னும் வரவில்லை", etc.) and English floor notes, maintaining full system functionality without throwing runtime errors.

### Frontend (`frontend/.env`)
Create `frontend/.env` (optional, defaults to relative `/api` proxy in Vite):

```env
VITE_API_URL="/api"
```

---

## 4. Step-by-Step Local Setup

### Step 4.1: Clone the Repository
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/knittrack-production-tracker.git
cd knittrack-production-tracker
```

### Step 4.2: Backend Setup & Dependencies
```bash
cd backend
npm install
```

### Step 4.3: Database Migration & Schema Generation
Ensure your PostgreSQL instance is running and `DATABASE_URL` is set in `backend/.env`.
```bash
# Generate Prisma Client
npx prisma generate

# Push schema directly to database (or run migrations)
npx prisma db push
```

### Step 4.4: Seed Realistic Sample Data
The seed script populates the database with the exact required assessment orders, Tiruppur factory units, and test accounts.
```bash
npm run db:seed
```

### Step 4.5: Frontend Setup & Dependencies
Open a second terminal window:
```bash
cd ../frontend
npm install
```

---

## 5. Starting the Application

### Running Backend (Development Mode)
```bash
cd backend
npm run dev
# Server listens on http://localhost:3001
```

### Running Frontend (Development Mode)
```bash
cd frontend
npm run dev
# Vite dev server runs on http://localhost:5173
```
Open your browser and navigate to `http://localhost:5173`.

---

## 6. Seeded Demo Accounts (One-Click Login Ready)

The application includes pre-configured demo user personas matching the Tiruppur export workflow:

| Role | Email | Password | Persona & Scope |
|---|---|---|---|
| **Merchandiser** | `merch@knittrack.com` | `merch123` | Priya Sundaram — Full order creation, TNA editing, delay audits, AI category corrections |
| **Supervisor (Unit 1)** | `supervisor1@knittrack.com` | `super123` | K. Murugan — Angeripalayam Main Unit; mobile floor updates, daily piece entry, photo proof |
| **Supervisor (Unit 2)** | `supervisor2@knittrack.com` | `super123` | S. Selvaraj — Kangeyam Road Unit; mobile floor updates |
| **Buyer (Company B)** | `buyer.b@knittrack.com` | `buyer123` | Sarah Johnson — Company B (UK); read-only portal for B-PO-88213 and B-PO-88240 |
| **Buyer (Company C)** | `buyer.c@knittrack.com` | `buyer123` | Hans Mueller — Company C (Germany); read-only portal for C-PO-0488 |
| **System Admin** | `admin@knittrack.com` | `admin123` | System Administrator — Full factory management, user oversight, audit logs |

> **Security Note:** Demo credentials are only for evaluation and local environments. In production, change all default passwords and enforce high-entropy credentials.

---

## 7. Running Automated Test Suites

The project maintains comprehensive test coverage across mathematical business logic, delay prediction, AI classification, authentication, and order workflows.

### Backend Unit & Integration Tests (Vitest)
```bash
cd backend
npm test
```
**Test Results:**
- `src/__tests__/delay.test.ts`: 24 passing tests (business day logic, rate calculations, zero rates, past deadlines, risk classification)
- `src/__tests__/ai.test.ts`: 13 passing tests (Tamil notes, English notes, empty notes, fallback mode, audit trails)
- `src/__tests__/auth.test.ts`: 12 passing tests (login, cookie issuance, RBAC, wrong password, token validation)
- `src/__tests__/orders.test.ts`: 20 passing tests (order creation, validation, tenant data isolation, supervisor scoping)
- **Total: 69 tests passing (100% pass rate)**

### Frontend Tests
```bash
cd frontend
npm test
```
**Test Results:**
- `src/__tests__/StatusBadge.test.tsx`: 4 passing tests (render On Track, At Risk, Delayed, AI Category badges)

### TypeScript Verification & Production Builds
```bash
# Verify backend build
cd backend
npm run build

# Verify frontend build
cd ../frontend
npm run build
```

---

## 8. Production Cloud Deployment Guide

### Option A: Database on Neon / Supabase (Free PostgreSQL)
1. Sign up at [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Create a new PostgreSQL database project named `knittrack`.
3. Copy the pooled connection string `postgresql://...` and set it as `DATABASE_URL`.

### Option B: Backend Deployment on Render / Railway
1. Fork or push the repository to your public GitHub account.
2. In [Render](https://render.com) or [Railway](https://railway.app), create a new **Web Service**.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to: `npm install && npx prisma generate && npm run build`
5. Set **Start Command** to: `npx prisma db push && npm run db:seed && npm start`
6. Configure Environment Variables:
   - `DATABASE_URL`: Hosted PostgreSQL connection string
   - `JWT_SECRET`: High-entropy 32+ character string
   - `FRONTEND_URL`: URL of your deployed frontend (e.g. `https://knittrack.vercel.app`)
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: Google Gemini API key

### Option C: Frontend Deployment on Vercel
1. In [Vercel](https://vercel.com), import your GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Set **Build Command** to: `npm run build`
5. Set **Output Directory** to: `dist`
6. Add Environment Variable:
   - `VITE_API_URL`: URL of your backend (e.g. `https://knittrack-backend.onrender.com/api`)
7. Click **Deploy**.

---

## 9. Troubleshooting & Common Issues

| Issue | Root Cause | Solution |
|---|---|---|
| `Prisma Client not initialized` | Prisma binary not generated | Run `cd backend && npx prisma generate` |
| `connect ECONNREFUSED 5432` | PostgreSQL is not running or invalid connection string | Verify `DATABASE_URL` in `backend/.env` and verify database server status |
| `AI returns fallback mode` | `GEMINI_API_KEY` is empty | Provide key from [aistudio.google.com](https://aistudio.google.com/) or rely on deterministic keyword fallback |
| `CORS Error on API requests` | `FRONTEND_URL` mismatch | Set `FRONTEND_URL` in backend `.env` to match frontend origin |
| `Cookie not set on cross-domain` | SameSite / Secure cookie policy | When hosting frontend and backend on different domains, configure `cookieOptions: { sameSite: 'none', secure: true }` |

---

## 10. Known Architectural Limitations

1. **Photo Storage in Development:** By default, photos uploaded from supervisor mobile devices are written to local disk (`backend/uploads`). In enterprise production, swap the local Multer disk storage for an S3/Cloud Storage presigned URL pipeline.
2. **Offline Synchronization:** The mobile interface alerts the user when offline; in the present MVP, updates are submitted when online. Background ServiceWorker synchronization with IndexedDB queuing is planned for v2.
3. **Buyer Self-Registration:** Buyers cannot register publicly without authorization; buyer accounts are provisioned exclusively by factory Merchandisers or Administrators to prevent data leakage.
