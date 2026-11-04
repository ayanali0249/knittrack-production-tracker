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
- **Presentation Layer:** React 19 Single Page Application built with TypeScript 5.7, Vite 8.3, and Tailwind CSS v4. Includes desktop analytics for merchandisers, high-contrast touch forms with offline IndexedDB queueing for mobile supervisors, and a scoped on-demand portal with merchandiser-approved advisories for international retail buyers.
- **API Gateway & Security Layer:** Node.js Express 4.21 server enforcing Helmet HTTP headers, CORS origin protection, environment-aware rate limiting, HttpOnly cookie JWT session authentication, and Zod schema validation.
- **Core Domain Services:** Layered business logic including the Order & Milestone Service, Deterministic Delay Prediction Engine (5-day business week run-rate arithmetic: Monday–Friday working days, weekends excluded, public holidays not modeled), Bilingual NLP AI Note Classifier (configured for Google Gemini `gemini-3.8-flash` with deterministic regex fallback), Supervisor Floor Update Service with `clientRequestId` idempotency deduplication, and Merchandiser Buyer Warning Approval Workflow.
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

## 3. Environment Configuration & Security Architecture

KnitTrack maintains a strict separation between configuration, credentials, and source code. Environment variables are loaded at startup via `dotenv`.

> **CRITICAL ASSESSMENT NOTICE — SECURITY & CONFIGURATION POLICY:**  
> In strict accordance with the assessment security guidelines, **this document lists environment variable names and their operational purposes only. No actual values, example connection strings, or placeholder secrets are provided.**  
> - Never commit `.env` files, actual credentials, or live API keys to Git.  
> - Evaluators and administrators must supply their own environment values in their local `.env` files.  
> - For JWT authentication, generate a cryptographically strong secret with at least 32 bytes (256 bits) of entropy.  
> - Pre-configured demo credentials described in Section 6 exist strictly for local evaluation against seeded sample data.

### 3.1 Backend Environment Variables (`backend/.env`)

The backend service requires the following environment variables. Set them in `backend/.env` (referenced from `backend/.env.example`):

| Variable Name | Status | Operational Purpose & Technical Specification |
|---|---|---|
| `DATABASE_URL` | **Required** | PostgreSQL connection URI containing protocol, database credentials, host address, port number, target database name, and schema configuration. |
| `JWT_SECRET` | **Required** | High-entropy secret key utilized for signing and verifying HMAC SHA-256 JSON Web Tokens. Must be at least 32 characters long. In production, generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `JWT_EXPIRES_IN` | Optional | Lifespan duration for issued JWT session tokens (e.g. standard time expressions like 24 hours). Defaults to 24h if omitted. |
| `PORT` | Optional | TCP port number on which the Node.js Express API server listens for incoming HTTP traffic. Defaults to port 3001 if omitted. |
| `NODE_ENV` | Optional | Execution runtime environment mode (`development`, `production`, or `test`). Determines error stack trace exposure and rate limiting thresholds. |
| `FRONTEND_URL` | Optional | Browser client origin URL permitted by CORS policy headers to make credentialed cross-origin requests. |
| `GEMINI_API_KEY` | Optional | Google Gemini API key used for live NLP classification of supervisor production floor notes. If omitted (as in local evaluation), the system automatically activates its embedded deterministic Tamil and English keyword regex fallback engine without throwing errors. |
| `UPLOAD_DIR` | Optional | Relative or absolute filesystem directory path where uploaded supervisor garment assembly photos are stored. Defaults to `./uploads`. |
| `MAX_FILE_SIZE_MB` | Optional | Maximum allowed file upload size threshold in megabytes enforced by Multer middleware. Defaults to 5 MB. |
| `RATE_LIMIT_API_MAX` | Optional | Maximum permitted API requests per 15-minute sliding window per IP address before triggering HTTP 429. Defaults to 5,000 in development and 100 in production. |
| `RATE_LIMIT_AUTH_MAX` | Optional | Maximum permitted authentication requests per 15-minute sliding window per IP address before triggering HTTP 429. Defaults to 200 in development and 10 in production. |

### 3.2 Frontend Environment Variables (`frontend/.env`)

The frontend application requires the following optional configuration:

| Variable Name | Status | Operational Purpose & Technical Specification |
|---|---|---|
| `VITE_API_URL` | Optional | Base URL or relative proxy path for outgoing backend API HTTP requests. In local development, defaults to `/api`, which is reverse-proxied by Vite to the backend service. |

---

## 4. Step-by-Step Local Deployment Runbook

### Live Cloud Deployment Status
> **NOTE ON CLOUD HOSTING:**  
> No live cloud deployment URL is available. In accordance with the take-home assessment brief, this project is packaged, delivered, and verified for local evaluation and repository inspection. Complete instructions for cloning, configuring, database seeding, running, and testing the application locally are provided below.

### Step 1: Clone Repository
```bash
git clone https://github.com/ayanali0249/knittrack-production-tracker.git
cd knittrack-production-tracker
```

### Step 2: Install Dependencies
Install dependencies for both backend and frontend applications:

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
| **Merchandiser** | `merch@knittrack.com` | `merch123` | Priya Sundaram (Senior Merchandiser) | Order creation, multi-size breakdowns, TNA milestone configuration, run-rate analytics, AI classification overrides, buyer warning approval/revocation. Order deletion is restricted strictly to Administrator (`DELETE /api/orders/:id`). |
| **Supervisor (Unit 1)** | `supervisor1@knittrack.com` | `super123` | K. Murugan (Unit 1 Main Supervisor) | Mobile daily shift logging, offline-first IndexedDB queueing, Tamil/English floor notes, photo proof uploads. Scoped to Unit 1 orders. |
| **Supervisor (Unit 2)** | `supervisor2@knittrack.com` | `super123` | S. Selvaraj (Unit 2 Finishing Supervisor) | Mobile daily shift logging, offline-first queueing. Scoped to Unit 2 orders. |
| **Buyer (Company B)** | `buyer.b@knittrack.com` | `buyer123` | Sarah Johnson (Company B, UK) | On-demand, query-based milestone progress, shipment countdown, approved photos, and merchandiser-approved floor advisories for orders `B-PO-88213`, `B-PO-88240`, `B-PO-88260`. Zero access to Unit costs, internal margins, unapproved warnings, or Company C data. |
| **Buyer (Company C)** | `buyer.c@knittrack.com` | `buyer123` | Hans Mueller (Company C, Germany) | On-demand visibility strictly for orders `C-PO-0488` and `C-PO-0512`. Strictly isolated from Company B. |
| **Administrator** | `admin@knittrack.com` | `admin123` | Factory General Manager | Global oversight, role provisioning, system settings, immutable audit log inspection, order deletion. |

> **Security Note:** All passwords in the database are stored as bcrypt hashes with 10 salt rounds. These accounts exist strictly for local evaluation.

---

## 7. Automated Testing & Verification Suite

KnitTrack maintains a 100% pass rate across unit, integration, and security test suites, totaling **102 automated tests**.

### 7.1 Running Backend Tests (Vitest & Supertest)
```bash
# From repository root:
npm --prefix backend test

# Or from backend directory:
cd backend && npm test
```
**Backend Test Results (89 tests passing across 6 test suites):**
- `src/__tests__/delay.test.ts` (24 tests): 5-day business week calculations (Monday–Friday, weekends excluded, public holidays not modeled), actual run rate, required run rate, zero output, past deadline conditions, and deterministic risk boundaries (`ON_TRACK`, `AT_RISK`, `DELAYED`).
- `src/__tests__/ai.test.ts` (13 tests): Tamil phrases, English text, whitespace resilience, rule-based fallback dictionary, and audit log generation on manual corrections.
- `src/__tests__/orders.test.ts` (20 tests): Purchase order creation, duplicate PO rejection, size ratio JSON validation, supervisor unit scoping, and pagination.
- `src/__tests__/auth.test.ts` (12 tests): Credential verification, bcrypt check, HttpOnly cookie issuance, token decoding, and cookie clearing on logout.
- `src/__tests__/rbac_isolation.test.ts` (13 tests): Cross-role 403 enforcement, Buyer B vs Buyer C isolation, timeline scoping, supervisor floor limits, and session invalidation.
- `src/__tests__/buyer_approval.test.ts` (7 tests): Merchandiser/Admin warning approval authorization, revocation, server-side filtering (unapproved warnings hidden from buyers), buyer modification rejection, and `clientRequestId` idempotency deduplication.

### 7.2 Running Frontend Tests (Vitest)
```bash
# From repository root:
npm --prefix frontend test

# Or from frontend directory:
cd frontend && npm test
```
**Frontend Test Results (13 tests passing across 2 test suites):**
- `src/__tests__/StatusBadge.test.tsx` (4 tests): Status badge semantic color rendering, risk level labels, and accessibility attributes.
- `src/__tests__/offlineQueue.test.ts` (9 tests): IndexedDB queueing when offline, persistent offline state, automatic sync on network reconnection, FIFO queue ordering, retry on network errors, idempotency preservation via `clientRequestId`, and 401/403 safe retention without data loss.

### 7.3 Grand Total
```text
Total Automated Tests: 102 passed / 102 total (100% pass rate)
- Backend Test Suites: 89 passed / 89 total
- Frontend Test Suites: 13 passed / 13 total
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

## 8. Offline-First Queueing & Buyer Approval Architecture

### 8.1 Offline Floor Queueing (`offlineQueue.service.ts`)
In factory environments with intermittent Wi-Fi or cellular dead zones, supervisors can continue logging production output without disruption:
- **Client Storage:** Updates are written to browser IndexedDB with an automatic localStorage fallback.
- **Idempotency Key:** Each update is generated with a client-side UUIDv4 `clientRequestId`.
- **Deduplication:** The PostgreSQL database enforces `UNIQUE(clientRequestId)` on `ProductionUpdate`. If an update is retried or submitted multiple times due to network flapping, the server detects the duplicate and returns the existing record without incrementing stage completion quantities twice.
- **Automatic Sync:** An `online` window event listener automatically flushes queued updates in FIFO order upon network restoration.
- **Auth Safety:** If a sync request returns HTTP 401 or 403 (e.g. session expired), the item is retained in the queue with an `auth_required` flag rather than dropped, preventing operator data loss.

### 8.2 Merchandiser Buyer Warning Approval Workflow
To prevent premature panic and preserve commercial relationships, raw floor delay notes are never surfaced directly to international retail buyers:
- **Server-Side Filtering:** `buyer.service.ts` queries filter updates with `where: { buyerWarningApproved: true }`. Raw floor warnings (`delayRisk: true` or critical delay categories) remain strictly internal until approved.
- **Merchandiser Approval:** Merchandisers and Admins review floor updates on the Order Detail page and can toggle buyer visibility via `PUT /api/production/updates/:id/approve-warning`.
- **Audit Logging:** Every approval or revocation is recorded in the `AuditLog` table with user identity and timestamp.
- **Buyer Presentation:** Approved notices appear under a dedicated "Merchandiser-Approved Advisories" section on the Buyer Portal, accompanied by official status notes and assembly photos.

---

## 9. Production Cloud Deployment Blueprint

KnitTrack is designed for containerized deployment on modern cloud platforms:

### Architecture Mapping
- **Frontend SPA:** Deploy to Vercel, Netlify, or AWS CloudFront/S3. Set build command to `npm run build` and publish directory to `dist`. Set `VITE_API_URL` to your production backend API domain.
- **Backend API Service:** Deploy to Render, Railway, or AWS ECS Fargate as a containerized Node.js service. Set build command to `npm install && npx prisma generate && npm run build` and start command to `node dist/index.js`.
- **Database:** Deploy on managed PostgreSQL (AWS RDS, Neon.tech, or Supabase). Set `DATABASE_URL` with SSL mode enabled (`?sslmode=require`).
- **Object Storage:** In production, configure an AWS S3 bucket or Cloudflare R2 bucket with presigned upload URLs, replacing the local Multer disk storage.

---

## 10. Comprehensive Troubleshooting & Error Matrix

| Symptom / Error | Root Cause | Verified Resolution |
|---|---|---|
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL service is stopped or port 5432 is blocked | Start the PostgreSQL service (`Start-Service postgresql*` on Windows or `sudo systemctl start postgresql` on Linux). Verify `DATABASE_URL` in `backend/.env`. |
| `connect EACCES 127.0.0.1:<port>` during Supertest | Windows terminal sandbox socket binding restriction | Run integration tests with socket permissions enabled or execute outside constrained sandbox environments. |
| `PrismaClientInitializationError: relation ... does not exist` | Database tables have not been created | Run `npx --prefix backend prisma db push` to synchronize the schema. |
| `HTTP 429: Too many requests. Please try again later.` | Rate limiter threshold exceeded | The development rate limiter allows 5,000 API requests and 200 auth attempts per 15 min. If triggered, wait for the 15-minute window or restart the backend process to reset memory counters. |
| `AI returns fallbackMode: true` | `GEMINI_API_KEY` is not provided or network timed out | This is expected behavior. KnitTrack automatically activates its embedded Tamil regex keyword classifier, ensuring full operational capability without an external API key. |
| `CORS Error: No 'Access-Control-Allow-Origin' header` | `FRONTEND_URL` mismatch | Verify that `FRONTEND_URL` in `backend/.env` exactly matches the browser origin (default: `http://localhost:5173`). |
| `Authentication cookie not preserved across requests` | Browser third-party cookie blocking or domain mismatch | Ensure credentials are included in client requests (`withCredentials: true`). In cross-origin deployments, configure `sameSite: 'none'` and `secure: true`. |
| `Pending offline updates not syncing` | Browser is offline or JWT session has expired | Check network status badge in the supervisor header. If expired, log in again; queued records are safely retained and will sync upon authentication. |

---

## 11. Operational Limitations & Roadmap

1. **Local Media Storage:** In local development, uploaded supervisor garment photos are stored in `backend/uploads/`. Production migration requires swapping local Multer storage for an S3-compatible cloud storage pipeline with presigned upload URLs.
2. **Background Sync without Browser Open:** The current offline queue operates in IndexedDB while the browser tab is open. Closed-browser background sync requires implementing the experimental ServiceWorker Background Sync API.
3. **In-Memory Rate Limiting:** Current rate limiting utilizes Node.js process memory. In a distributed multi-instance deployment, rate limiting should be backed by a centralized Redis cluster.
