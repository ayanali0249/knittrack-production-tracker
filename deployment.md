# KnitTrack — Production Order-Tracking System
## Deployment Runbook & Operations Guide

**Assessment Brief:** Isocode Labs Software Engineering Intern Take-Home Assessment  
**Project:** KnitTrack — Production Order Tracking System for Knitwear Exporters with Buyer View  
**Domain Context:** [Illustrative Assessment Scenario] Model knitwear garment export manufacturing workflows based in Tiruppur, Tamil Nadu, India  
**Author:** Ayan Ali ([GitHub](https://github.com/ayanali0249/knittrack-production-tracker))  
**Date:** November 2026  
**Document Classification:** Technical Evaluation & Deployment Baseline  

---

## 1. System Overview & Scope

KnitTrack is a production tracking and operational visibility platform designed for knitwear apparel exporters in Tiruppur, Tamil Nadu. It provides end-to-end milestone visibility across sequential manufacturing stages: **Cutting**, **Stitching**, **Printing**, **Washing**, **Finishing**, and **Packing**.

The platform is structured into four decoupled layers:
- **Presentation Layer:** React 19 Single Page Application built with TypeScript 5.7, Vite 8.3, and Tailwind CSS v4. Includes desktop analytics for merchandisers, high-contrast touch forms for mobile supervisors, and a scoped on-demand portal for international retail buyers.
- **API Gateway & Security Layer:** Node.js Express 4.21 server enforcing Helmet HTTP headers, CORS origin protection, environment-aware rate limiting, HttpOnly cookie JWT session authentication, and Zod schema validation.
- **Core Domain Services:** Layered business logic including the Order & Milestone Service, Deterministic Delay Prediction Engine (5-day business week run-rate arithmetic: Monday–Friday working days, weekends excluded, public holidays not modeled), Bilingual NLP AI Note Classifier (configured for Google Gemini `gemini-3.8-flash` with deterministic regex fallback), and Supervisor Floor Update Service.
- **Persistence & Storage Layer:** PostgreSQL relational database (verified on PostgreSQL 17, supports v14+) managed through Prisma ORM 5.22 (3NF schema with foreign keys and compound unique constraints), with local disk storage for garment assembly photographs in development.

---

## 2. System Prerequisites

Before deploying or running KnitTrack, ensure the following runtime dependencies are installed on the host machine:

| Component | Minimum Required Version | Recommended Version | Verification Command |
|---|---|---|---|
| **Node.js** | `v20.19.0` (required by Vite 8.3 engine) | `v20.x` or `v24.x` LTS (verified on `v24.14.1`) | `node -v` |
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
# From repository root:
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
# High-entropy random secret (minimum 32 characters for HMAC SHA-256).
# Generate a secure secret using:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# NEVER use a hardcoded or sample secret in production.
JWT_SECRET="YOUR_SECURE_RANDOM_JWT_SECRET_PLACEHOLDER_MIN_32_CHARS"
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
# Configured target model: gemini-3.8-flash
# Note on Google deprecation lifecycle: Gemini 1.5 Flash was retired in late 2025,
# and Gemini 2.0 Flash was shut down on June 1, 2026. The backend has been migrated
# to gemini-3.8-flash.
# Obtain an API key at: https://aistudio.google.com/
# If left empty (the default in this local assessment evaluation), KnitTrack
# automatically activates its embedded Tamil/English deterministic keyword
# fallback classifier without throwing runtime errors. Live cloud calls have
# not been verified with an active key in this offline assessment environment;
# code configuration is strictly distinguished from live API verification.
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

The frontend development server uses Vite's reverse proxy configured in `frontend/vite.config.ts`, directing `/api` requests to `http://localhost:3001`.

If deploying to a custom host or CDN, create `frontend/.env`:

```env
VITE_API_URL="/api"
```

---

## 4. Step-by-Step Local Deployment Runbook

### Step 1: Clone Repository
```bash
# Clone the repository
git clone https://github.com/ayanali0249/knittrack-production-tracker.git
cd knittrack-production-tracker
```

### Step 2: Install Dependencies
Install dependencies for both backend and frontend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to repository root
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

#### Schema Synchronization & Data Safety Notice
Synchronize the Prisma schema with the PostgreSQL database:

```bash
# Option A: From repository root
npx --prefix backend prisma generate
npx --prefix backend prisma db push

# Option B: If inside the backend directory (cd backend)
npx prisma generate
npx prisma db push
```

> **IMPORTANT SCHEMA MIGRATION & DATA SAFETY WARNING:**  
> `npx prisma db push` applies declarative schema changes directly to the database without generating SQL migration files.  
> - **Non-destructive updates:** When adding new nullable columns, tables, or non-conflicting indexes, existing data is preserved.  
> - **Destructive updates:** If changes drop columns, alter data types, or add non-null columns without default values, `prisma db push` may prompt to reset tables, resulting in **irreversible data loss**.  
> - **Operational Best Practice:** Always review Prisma's terminal output before confirming schema updates, verify schema diffs against your staging environment, and create a full database backup (`pg_dump`) prior to running schema operations on valuable data.

#### Seed Demo Data (Destructive to Existing Orders)
> **WARNING:** The seed script (`npm run db:seed`) clears existing orders and audit logs before populating the database with the standard 7 sample assessment orders and 8 demo persona accounts. Only run this during initial setup or when resetting demo data.

```bash
# Option A: From repository root
npm --prefix backend run db:seed

# Option B: If inside the backend directory (cd backend)
npm run db:seed
```

#### Safe Read-Only Verification
To verify the database state without modifying or clearing any records, run the read-only verification harness:

```bash
# Option A: From repository root (Exact Copy-Paste Command)
npx --prefix backend tsx backend/scripts/verify-orders.ts

# Option B: If inside the backend directory (cd backend)
npx tsx scripts/verify-orders.ts
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

> **Note on Order C-PO-0512:** Although C-PO-0512 carries an ex-factory date of 2026-10-25, its status in the database is `COMPLETED` and all 5,000 planned units across Cutting, Stitching, Finishing, and Packing were 100% completed on or before 2026-10-06. Because remaining quantity is 0 and all stages are marked `COMPLETED`, the calculation engine sets remainingQuantity = 0 and projectedDelayDays = 0, correctly evaluating the order as `ON_TRACK`.

---

## 5. Starting the Application

For local evaluation, run the backend API server and frontend development server concurrently in two terminal sessions:

### Terminal 1: Backend API Service
```bash
# From repository root:
npm --prefix backend run dev

# Or from backend directory:
cd backend && npm run dev
```
- **Service Endpoint:** `http://localhost:3001`
- **Health Check:** `http://localhost:3001/api/health` (returns `{"status":"ok"}`)

### Terminal 2: Frontend Client Application
```bash
# From repository root:
npm --prefix frontend run dev

# Or from frontend directory:
cd frontend && npm run dev
```
- **Application URL:** `http://localhost:5173`
- Vite automatically proxies `/api` requests to `http://localhost:3001/api`.

Open your browser and navigate to: **`http://localhost:5173`**

---

## 6. Seeded Demo Persona Accounts

The database includes 6 pre-configured user personas representing the Tiruppur export workflow. Evaluators can log in using the credentials below, or click any account in the frontend **Demo Switcher** toolbar:

| Role | Email | Password | Persona & Assigned Scope | Operational Boundaries |
|---|---|---|---|---|
| **Merchandiser** | `merch@knittrack.com` | `merch123` | Priya Sundaram (Senior Merchandiser) | Order creation, multi-size breakdowns, TNA milestone configuration, run-rate analytics, AI classification overrides. Order deletion is restricted strictly to Administrator (`DELETE /api/orders/:id`). |
| **Supervisor (Unit 1)** | `supervisor1@knittrack.com` | `super123` | K. Murugan (Unit 1 Main Supervisor) | Mobile daily shift logging, Tamil/English floor notes, photo proof uploads. Scoped to Unit 1 orders. |
| **Supervisor (Unit 2)** | `supervisor2@knittrack.com` | `super123` | S. Selvaraj (Unit 2 Finishing Supervisor) | Mobile daily shift logging. Scoped to Unit 2 orders. |
| **Buyer (Company B)** | `buyer.b@knittrack.com` | `buyer123` | Sarah Johnson (Company B, UK) | On-demand, query-based milestone progress, shipment countdown, approved photos for orders `B-PO-88213`, `B-PO-88240`, `B-PO-88260`. Zero access to Unit costs or Company C data. |
| **Buyer (Company C)** | `buyer.c@knittrack.com` | `buyer123` | Hans Mueller (Company C, Germany) | On-demand visibility strictly for orders `C-PO-0488` and `C-PO-0512`. Strictly isolated from Company B. |
| **Administrator** | `admin@knittrack.com` | `admin123` | Factory General Manager | Global oversight, role provisioning, system settings, immutable audit log inspection, order deletion. |

> **Security Note:** All passwords in the database are stored as bcrypt hashes with 10 salt rounds. These accounts exist strictly for local evaluation.

---

## 7. Automated Testing & Verification Suite

KnitTrack maintains 100% pass rates across unit, integration, and security test suites.

### 7.1 Running Backend Tests (Vitest & Supertest)
```bash
# From repository root:
npm --prefix backend test

# Or from backend directory:
cd backend && npm test
```
**Test Results (82 tests passing):**
- `src/__tests__/delay.test.ts` (24 tests): 5-day business week calculations (Monday–Friday, weekends excluded, public holidays not modeled), actual run rate, required run rate, zero output, past deadline conditions, and deterministic risk boundaries (`ON_TRACK`, `AT_RISK`, `DELAYED`).
- `src/__tests__/ai.test.ts` (13 tests): Tamil phrases, English text, whitespace resilience, rule-based fallback dictionary, and audit log generation on manual corrections.
- `src/__tests__/orders.test.ts` (20 tests): Purchase order creation, duplicate PO rejection, size ratio JSON validation, supervisor unit scoping, and pagination.
- `src/__tests__/auth.test.ts` (12 tests): Credential verification, bcrypt check, HttpOnly cookie issuance, token decoding, and cookie clearing on logout.
- `src/__tests__/rbac_isolation.test.ts` (13 tests): Cross-role 403 enforcement, Buyer B vs Buyer C isolation, timeline scoping, supervisor floor limits, and session invalidation.

### 7.2 Running Frontend Tests (Vitest)
```bash
# From repository root:
npm --prefix frontend test

# Or from frontend directory:
cd frontend && npm test
```
**Test Results (4 tests passing):**
- `src/__tests__/StatusBadge.test.tsx` (4 tests): Status badge semantic color rendering, risk level labels, and accessibility attributes.

### 7.3 Grand Total
```text
Total Automated Tests: 86 passed / 86 total (100% pass rate)
```

### 7.4 TypeScript Compiler & Production Build Checks
```bash
# Verify backend TypeScript compilation (from root):
npm --prefix backend run build
# Expected: Exit code 0, clean output in backend/dist/

# Verify frontend production bundle (from root):
npm --prefix frontend run build
# Expected: Exit code 0, optimized bundle in frontend/dist/
```

---

## 8. Production Cloud Deployment Blueprint

KnitTrack is designed for containerized deployment on cloud infrastructure:

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
| `PrismaClientInitializationError: relation ... does not exist` | Database tables have not been created | Run `npx --prefix backend prisma db push` to synchronize the schema. |
| `HTTP 429: Too many requests. Please try again later.` | Rate limiter threshold exceeded | The development rate limiter allows 5,000 API requests and 200 auth attempts per 15 min. If triggered, wait for the 15-minute window or restart the backend process to reset memory counters. |
| `AI returns fallbackMode: true` | `GEMINI_API_KEY` is not provided or network timed out | This is expected behavior. KnitTrack automatically activates its embedded Tamil regex keyword classifier, ensuring full operational capability without an external API key. |
| `CORS Error: No 'Access-Control-Allow-Origin' header` | `FRONTEND_URL` mismatch | Verify that `FRONTEND_URL` in `backend/.env` exactly matches the browser origin (default: `http://localhost:5173`). |
| `Authentication cookie not preserved across requests` | Browser third-party cookie blocking or domain mismatch | Ensure credentials are included in client requests (`withCredentials: true`). In cross-origin deployments, configure `sameSite: 'none'` and `secure: true`. |

---

## 10. Operational Limitations & V2 Engineering Roadmap

1. **Local Media Storage:** In local development, uploaded supervisor garment photos are stored in `backend/uploads/`. Production migration requires swapping local Multer storage for an S3-compatible cloud storage pipeline with presigned upload URLs.
2. **Offline Synchronization:** The mobile floor update UI alerts supervisors when connectivity drops. Full offline ServiceWorker queueing with IndexedDB synchronization is architected for the v2 release.
3. **In-Memory Rate Limiting:** Current rate limiting utilizes Node.js process memory. In a distributed multi-instance deployment, rate limiting should be backed by a centralized Redis cluster.
