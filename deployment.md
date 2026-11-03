# KnitTrack — Production Order-Tracking System
## Enterprise Deployment Runbook & Operations Guide

**Assessment Brief:** Isocode Labs Software Engineering Intern Take-Home Assessment  
**Project:** KnitTrack — Production Order Tracking System for Knitwear Exporters with Buyer View  
**Target Client:** Company A, Tiruppur, Tamil Nadu, India (₹95–110 Cr Revenue, 900 Factory Operators)  
**Author:** Ayan Ali ([GitHub](https://github.com/ayanali0249/knittrack-production-tracker))  
**Date:** November 2026  
**Document Classification:** Technical Evaluation & Deployment Baseline  

---

## 1. System Overview & Scope

KnitTrack is an enterprise-grade production tracking and operational intelligence platform designed for knitwear apparel exporters in Tiruppur, Tamil Nadu. It provides end-to-end visibility across circular knitting manufacturing stages: **Cutting**, **Stitching**, **Printing**, **Washing**, **Finishing**, and **Packing**.

The platform is structured into four decoupled layers:
- **Presentation Layer:** React 19 Single Page Application built with TypeScript 5.7, Vite 8.3, and Tailwind CSS v4. Includes desktop analytics for merchandisers, high-contrast touch forms for Android mobile supervisors, and a tenant-isolated portal for international retail buyers.
- **API Gateway & Security Layer:** Node.js Express 4.21 server enforcing Helmet HTTP headers, CORS origin protection, environment-aware rate limiting, HttpOnly cookie JWT session authentication, and Zod schema validation.
- **Core Domain Services:** Layered business logic including the Order & Milestone Service, Deterministic Delay Prediction Engine (5-day business week run-rate arithmetic), Bilingual NLP AI Note Classifier (Google Gemini API with deterministic regex fallback), and Supervisor Floor Update Service.
- **Persistence & Storage Layer:** PostgreSQL 17 relational database managed through Prisma ORM 5.22 (3NF schema with foreign keys and compound unique constraints), with local disk storage for garment assembly photographs.

---

## 2. System Prerequisites

Before deploying or running KnitTrack, ensure the following runtime dependencies are installed on the host machine:

| Component | Minimum Required Version | Recommended Version | Verification Command |
|---|---|---|---|
| **Node.js** | `v18.0.0` | `v20.x` or `v24.x` (LTS) | `node -v` |
| **npm** | `v9.0.0` | `v10.x` or higher | `npm -v` |
| **PostgreSQL** | `v14.0` | `v17.x` (or managed Neon/Supabase) | `psql -V` |
| **Git** | `v2.30.0` | Latest release | `git --version` |
| **PowerShell** (Windows) | `5.1` or `7.x` | Windows Terminal / PowerShell 7 | `$PSVersionTable.PSVersion` |

---

## 3. Environment Configuration & Security Best Practices

KnitTrack maintains a strict separation between configuration, credentials, and code. Environment variables are loaded at startup via `dotenv`.

> **CRITICAL SECURITY NOTICE:**
> - Never commit `.env` files or hardcoded credentials into Git.
> - The values below use safe placeholders. In production, generate cryptographically random secrets.
> - Seeded demo credentials are provided **strictly for local evaluation** and must never be used in a public or production environment.

### 3.1 Backend Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```bash
# Windows PowerShell
Copy-Item backend\.env.example backend\.env

# Linux / macOS
cp backend/.env.example backend/.env
```

Configure `backend/.env` with your local settings:

```env
# -----------------------------------------------------------------------------
# DATABASE CONNECTION
# -----------------------------------------------------------------------------
# Format: postgresql://<username>:<password>@<host>:<port>/<database>?schema=public
DATABASE_URL="postgresql://postgres:YOUR_LOCAL_DB_PASSWORD@localhost:5432/knittrack?schema=public"

# -----------------------------------------------------------------------------
# AUTHENTICATION & JWT SECURITY
# -----------------------------------------------------------------------------
# High-entropy random secret (minimum 32 characters for production HMAC SHA-256)
JWT_SECRET="knittrack-evaluation-secret-key-min-32-chars-2026-secure"
JWT_EXPIRES_IN="24h"

# -----------------------------------------------------------------------------
# SERVER & NETWORK CONFIGURATION
# -----------------------------------------------------------------------------
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# -----------------------------------------------------------------------------
# GOOGLE GEMINI AI CONFIGURATION (OPTIONAL)
# -----------------------------------------------------------------------------
# Obtain a free API key at: https://aistudio.google.com/
# If left empty, KnitTrack automatically activates its embedded Tamil/English
# deterministic keyword fallback classifier without throwing runtime errors.
GEMINI_API_KEY=""

# -----------------------------------------------------------------------------
# FILE STORAGE & RATE LIMITING
# -----------------------------------------------------------------------------
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=5

# Rate Limits (Dev: 5,000 API / 200 Auth; Production: 100 API / 10 Auth per 15 min)
RATE_LIMIT_API_MAX=5000
RATE_LIMIT_AUTH_MAX=200
```

### 3.2 Frontend Configuration (`frontend/.env`)

The frontend dev server uses Vite's built-in reverse proxy configured in `frontend/vite.config.ts`, directing `/api` requests to `http://localhost:3001`.

If deploying to a custom host or CDN, create `frontend/.env`:

```env
VITE_API_URL="/api"
```

---

## 4. Step-by-Step Local Deployment Runbook

### Step 1: Clone Repository
```bash
git clone https://github.com/ayanali0249/knittrack-production-tracker.git
cd knittrack-production-tracker
```

### Step 2: Install Dependencies
Install both backend and frontend dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Step 3: Database Initialization & Migrations

Ensure your PostgreSQL service is running on `localhost:5432`.

```powershell
# Windows PowerShell: Verify PostgreSQL service status
Get-Service -Name postgresql*
# If stopped, start it:
Start-Service postgresql-x64-17
```

```bash
# Linux / macOS: Verify PostgreSQL service status
sudo systemctl status postgresql
# If stopped, start it:
sudo systemctl start postgresql
```

Create the `knittrack` database if it does not already exist:
```sql
-- Connect via psql:
CREATE DATABASE knittrack;
```

#### Safe Schema Synchronization (Non-Destructive)
Synchronize the Prisma schema with the PostgreSQL database:
```bash
cd backend
npx prisma generate
npx prisma db push
```
> **Notice:** `npx prisma db push` synchronizes table structures, relations, and unique constraints without dropping or clearing existing production orders.

#### Seed Demo Data (Destructive to Existing Orders)
> **WARNING:** The seed script (`npm run db:seed`) clears existing orders and audit logs, repopulating the database with the standard 7 sample assessment orders and 8 demo persona accounts. Only run this during initial setup or when resetting demo data.

```bash
cd backend
npm run db:seed
```

#### Safe Read-Only Verification
To verify the database state without modifying or clearing any records, run the read-only verification harness:
```bash
npx tsx backend/scripts/verify-orders.ts
```
Expected output:
```text
Total Seeded Orders Found: 7
[A-PO-5510] Women's hoodie, charcoal | Ex-Factory: 2026-11-08 | Risk: DELAYED
[A-PO-5525] Men's jogger pants, olive | Ex-Factory: 2026-12-15 | Risk: ON_TRACK
[B-PO-88213] Men's crew neck tee, navy | Ex-Factory: 2026-11-20 | Risk: ON_TRACK
[B-PO-88240] Men's polo, white | Ex-Factory: 2026-11-12 | Risk: AT_RISK
[B-PO-88260] Men's V-neck tee, burgundy | Ex-Factory: 2026-12-20 | Risk: ON_TRACK
[C-PO-0488] Kids printed tee, yellow | Ex-Factory: 2026-11-28 | Risk: ON_TRACK
[C-PO-0512] Women's tank top, coral | Ex-Factory: 2026-10-25 | Risk: ON_TRACK
Total Users in Database: 8
```

---

## 5. Starting the Application

For local evaluation, run the backend API server and frontend development server concurrently in two terminal sessions:

### Terminal 1: Backend API Service
```bash
cd backend
npm run dev
```
- **Service Endpoint:** `http://localhost:3001`
- **Health Check:** `http://localhost:3001/api/health` (returns `{"status":"ok"}`)

### Terminal 2: Frontend Client Application
```bash
cd frontend
npm run dev
```
- **Application URL:** `http://localhost:5173`
- Vite automatically proxies `/api` requests to `http://localhost:3001/api`.

Open your browser and navigate to: **`http://localhost:5173`**

---

## 6. Seeded Demo Persona Accounts

The database includes 6 pre-configured user personas representing the Tiruppur export hierarchy. Evaluators can log in using the credentials below, or click any account in the frontend **Demo Switcher** banner:

| Role | Email | Password | Persona & Assigned Scope | Operational Boundaries |
|---|---|---|---|---|
| **Merchandiser** | `merch@knittrack.com` | `merch123` | Priya Sundaram (Senior Merchandiser) | Full order creation, multi-size breakdowns, TNA milestone configuration, run-rate analytics, AI classification overrides |
| **Supervisor (Unit 1)** | `supervisor1@knittrack.com` | `super123` | K. Murugan (Unit 1 Main Supervisor) | Mobile daily shift logging, Tamil/English floor notes, photo proof uploads. Scoped to Unit 1 orders |
| **Supervisor (Unit 2)** | `supervisor2@knittrack.com` | `super123` | S. Selvaraj (Unit 2 Finishing Supervisor) | Mobile daily shift logging. Scoped to Unit 2 orders |
| **Buyer (Company B)** | `buyer.b@knittrack.com` | `buyer123` | Sarah Johnson (Company B, UK) | Read-only milestone progress, shipment countdown, approved photos for orders `B-PO-88213`, `B-PO-88240`, `B-PO-88260`. Zero access to Unit costs or Company C data |
| **Buyer (Company C)** | `buyer.c@knittrack.com` | `buyer123` | Hans Mueller (Company C, Germany) | Read-only visibility strictly for orders `C-PO-0488` and `C-PO-0512`. Strictly isolated from Company B |
| **Administrator** | `admin@knittrack.com` | `admin123` | Factory General Manager | Global oversight, role provisioning, system settings, immutable audit log inspection |

> **Security Note:** All passwords in the database are stored as bcrypt hashes with 10 salt rounds. These accounts exist strictly for local evaluation.

---

## 7. Automated Testing & Verification Suite

KnitTrack maintains 100% pass rates across unit, integration, and security test suites.

### 7.1 Running Backend Tests (Vitest & Supertest)
```bash
cd backend
npm test
```
**Test Results (82 tests passing):**
- `src/__tests__/delay.test.ts` (24 tests): 5-day business week calculations, actual run rate, required run rate, zero output, past deadline conditions, and deterministic risk boundaries (`ON_TRACK`, `AT_RISK`, `DELAYED`).
- `src/__tests__/ai.test.ts` (13 tests): Tamil phrases, English text, whitespace resilience, rule-based fallback dictionary, and audit log generation on manual corrections.
- `src/__tests__/orders.test.ts` (20 tests): Purchase order creation, duplicate PO rejection, size ratio JSON validation, supervisor unit scoping, and pagination.
- `src/__tests__/auth.test.ts` (12 tests): Credential verification, bcrypt check, HttpOnly cookie issuance, token decoding, and cookie clearing on logout.
- `src/__tests__/rbac_isolation.test.ts` (13 tests): Cross-role 403 enforcement, Buyer B vs Buyer C isolation, timeline scoping, supervisor floor limits, and session invalidation.

### 7.2 Running Frontend Tests (Vitest)
```bash
cd frontend
npm test
```
**Test Results (4 tests passing):**
- `src/__tests__/StatusBadge.test.tsx` (4 tests): Status badge semantic color rendering, risk level labels, and accessibility attributes.

### 7.3 Grand Total
```text
Total Automated Tests: 86 passed / 86 total (100% pass rate)
```

### 7.4 TypeScript Compiler & Production Build Checks
```bash
# Verify backend TypeScript compilation
cd backend
npm run build
# Expected: Exit code 0, clean output in backend/dist/

# Verify frontend production bundle
cd ../frontend
npm run build
# Expected: Exit code 0, optimized bundle in frontend/dist/
```

---

## 8. Production Cloud Deployment Blueprint

KnitTrack is designed for stateless containerized deployment on cloud infrastructure:

### Architecture Mapping
- **Frontend SPA:** Deploy to Vercel or Netlify. Set build command to `npm run build` and output directory to `dist`. Set `VITE_API_URL` to your production backend URL.
- **Backend API Service:** Deploy to Render, Railway, or AWS ECS Fargate as a containerized Node.js service. Set build command to `npm install && npx prisma generate && npm run build` and start command to `node dist/index.js`.
- **Database:** Deploy on managed PostgreSQL (AWS RDS, Neon.tech, or Supabase). Set `DATABASE_URL` with SSL mode enabled (`?sslmode=require`).
- **Object Storage:** In production, configure an AWS S3 bucket or Cloudflare R2 bucket with presigned upload URLs, replacing the local Multer disk storage.

---

## 9. Comprehensive Troubleshooting & Error Matrix

| Symptom / Error | Root Cause | Verified Resolution |
|---|---|---|
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL service is stopped or port 5432 is blocked | Start the PostgreSQL service (`Start-Service postgresql*` on Windows or `sudo systemctl start postgresql` on Linux). Verify `DATABASE_URL` in `backend/.env`. |
| `connect EACCES 127.0.0.1:<port>` during Supertest | Windows terminal sandbox socket binding restriction | Run integration tests with socket permissions enabled or execute outside constrained sandbox environments. |
| `PrismaClientInitializationError: relation ... does not exist` | Database tables have not been created | Run `cd backend && npx prisma db push` to synchronize the schema. |
| `HTTP 429: Too many requests. Please try again later.` | Rate limiter threshold exceeded | The development rate limiter allows 5,000 API requests and 200 auth attempts per 15 min. If triggered, wait for the 15-minute window or restart the backend process to reset memory counters. |
| `AI returns fallbackMode: true` | `GEMINI_API_KEY` is not provided or network timed out | This is expected behavior. KnitTrack automatically activates its embedded Tamil regex keyword classifier, ensuring full operational capability without an external API key. |
| `CORS Error: No 'Access-Control-Allow-Origin' header` | `FRONTEND_URL` mismatch | Verify that `FRONTEND_URL` in `backend/.env` exactly matches the browser origin (default: `http://localhost:5173`). |
| `Authentication cookie not preserved across requests` | Browser third-party cookie blocking or domain mismatch | Ensure credentials are included in client requests (`withCredentials: true`). In cross-origin deployments, configure `sameSite: 'none'` and `secure: true`. |

---

## 10. Operational Limitations & V2 Engineering Roadmap

1. **Local Media Storage:** In local development, uploaded supervisor garment photos are stored in `backend/uploads/`. Production migration requires swapping local Multer storage for an S3-compatible cloud storage pipeline with presigned upload URLs.
2. **Offline Synchronization:** The mobile floor update UI alerts supervisors when connectivity drops. Full offline ServiceWorker queueing with IndexedDB synchronization is architected for the v2 release.
3. **In-Memory Rate Limiting:** Current rate limiting utilizes Node.js process memory. In a distributed multi-instance deployment, rate limiting should be backed by a centralized Redis cluster.
