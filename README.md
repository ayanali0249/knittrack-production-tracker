# KnitTrack — Knitwear Exporter Production Order-Tracking Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-86%2F86%20Passing%20(100%25)-brightgreen?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Repository:** [https://github.com/ayanali0249/knittrack-production-tracker](https://github.com/ayanali0249/knittrack-production-tracker)  
> **Documentation:** [Technical Design Document](Technical_Design_Document.docx) • [Deployment Guide](deployment.md)  
> **Author:** Ayan Ali ([GitHub](https://github.com/ayanali0249) • [LinkedIn](https://www.linkedin.com/in/ayanali0249) • [Portfolio](https://ayan-ali-0249.netlify.app))  
> **Assessment Context:** Isocode Labs Software Engineering Intern Take-Home Assessment (Knitwear Exporter Order-Tracking System with Buyer View)

---

## 1. Executive Overview

In Tiruppur, Tamil Nadu—India's knitwear export capital—apparel export manufacturers handle high-volume export orders across fragmented manufacturing units (cutting, stitching, printing, washing, finishing, and packing). 

Traditionally, operations suffer from three critical bottlenecks:
1. **Floor Communication Silos:** Supervisors in geographically dispersed factory units relay daily piece counts over informal phone calls or paper logbooks, leading to double-counting and untracked work.
2. **Latent Delay Discovery:** Bottlenecks (such as fabric shortages or sewing machine breakdowns) are uncovered days before the ex-factory date, forcing manufacturers into expensive emergency airfreight.
3. **High Communication Overhead:** International buyers continuously email merchandisers for milestone percentages and fabric photographs.

**KnitTrack** is a full-stack, enterprise-grade production tracking and visibility system engineered specifically for Tiruppur knitwear garment exporters. It replaces spreadsheets and phone updates with:
- A centralized **Production Order Management Board** with real-time status, run rates, and risk indicators.
- A **Deterministic Delay Prediction Engine** calculating required vs. actual daily production rates without opaque approximations.
- A **Low-Bandwidth Mobile Floor Update Screen** designed for factory floor supervisors with single-tap quick quantities and photo proof uploads.
- An **AI-Assisted Tamil & English Note Classifier** powered by Google Gemini (with an offline-safe keyword dictionary fallback) that categorizes factory floor delay reasons.
- A **Tenant-Isolated Buyer Tracking Portal** offering international apparel buyers real-time milestone progress, shipment countdowns, and approved assembly photos while strictly hiding internal costs, margins, and other brands' orders.

---

## 2. System Architecture

KnitTrack follows a decoupled three-tier enterprise client-server architecture with strict separation of concerns, robust type safety, and cryptographic tenant boundary enforcement:

```mermaid
flowchart TD
    subgraph ClientTiers["Client Presentation Tier (React 19 + TypeScript + Vite)"]
        MD["Merchandiser Dashboard<br/>(Full Order & TNA Control)"]
        SF["Supervisor Floor UI<br/>(Mobile Touch, Photo Upload)"]
        BP["Buyer Read-Only Portal<br/>(Tenant-Isolated Orders)"]
    end

    subgraph SecurityGateway["Security & API Gateway (Express 4 + TypeScript)"]
        CORS["CORS & Helmet Security"]
        RL["Environment-Aware Rate Limiter<br/>(Dev: 5000 / Prod: 100 req/15m)"]
        AUTH["HttpOnly Cookie JWT Authentication"]
        RBAC["Server-Side RBAC Guard Middleware"]
        ZOD["Zod Schema Validation & Multer"]
    end

    subgraph CoreServices["Backend Application Layer (Domain Services)"]
        OS["Order & TNA Milestone Service"]
        PS["Production Update & Floor Service"]
        DE["Deterministic Delay Prediction Engine<br/>(5-Day Mon-Fri Business Math)"]
        AI["Tamil/English AI Note Classifier<br/>(Gemini Flash + Deterministic Fallback)"]
        BS["Buyer Portal Service (Tenant Scoping)"]
    end

    subgraph DatabaseTier["Persistence Layer (PostgreSQL 14+ via Prisma ORM)"]
        DB[("PostgreSQL Database<br/>• ProductionOrder<br/>• OrderStage (Milestones)<br/>• ProductionUpdate (Daily Counts)<br/>• User (Roles & Units)<br/>• Buyer (Tenants)<br/>• AuditLog")]
    end

    MD --> CORS
    SF --> CORS
    BP --> CORS

    CORS --> RL --> AUTH --> RBAC --> ZOD

    ZOD --> OS
    ZOD --> PS
    ZOD --> DE
    ZOD --> AI
    ZOD --> BS

    OS --> DB
    PS --> DB
    DE --> DB
    AI --> DB
    BS --> DB
```

---

## 3. Implemented Feature Breakdown

| Feature | Implementation Details | Status |
|---|---|:---:|
| **Production Order Lifecycle** | Full CRUD for export purchase orders: PO number, style name, buyer assignment, factory unit allocation, colour, structured size breakdowns (`S`, `M`, `L`, `XL`), total quantity, and ex-factory dates. | **Implemented** |
| **TNA Milestone Tracking** | Sequential Time-and-Action stages (`Cutting`, `Printing`, `Stitching`, `Washing`, `Finishing`, `Packing`) with planned start/end dates and real-time quantity completion tracking. | **Implemented** |
| **Supervisor Floor Updates** | Mobile-first daily count submissions with quick-fill quantity buttons (`+100`, `+250`, `+500`, `+1000`), factory floor notes, and camera/photo attachment pipeline. | **Implemented** |
| **Deterministic Delay Prediction** | Mathematical run-rate engine evaluating 5-day business weeks (Mon–Fri). Computes Actual Run Rate, Required Run Rate, Estimated Completion Date, and Projected Delay Days. | **Implemented** |
| **Transparent Delay Explanations** | Modal breakdown detailing exact formulas, elapsed production days, pace pressure factors, and plain-English operational summaries. | **Implemented** |
| **Buyer Tracking Portal** | Read-only view for overseas buyers displaying active purchase orders, stage progress bars, ex-factory countdowns, and approved assembly photos. | **Implemented** |
| **Tenant Data Isolation** | Query-level database scoping (`where: { buyerId: req.user.buyerId }`). Prevents Buyer B from reading or querying Buyer C orders, timelines, or delay analyses. | **Implemented** |
| **Server-Side RBAC** | Role-based authorization (`ADMIN`, `MERCHANDISER`, `SUPERVISOR`, `BUYER`) enforced in route middleware; roles are sourced solely from verified JWT and database records. | **Implemented** |
| **AI Tamil Note Classification** | NLP classification for colloquial Tamil and English floor notes into 8 export delay categories (machine breakdown, labour shortage, material shortage, power outage, etc.). | **Implemented** |
| **Deterministic AI Fallback** | In-memory Tamil keyword dictionary automatically engages if the Gemini API key is missing or unreachable, ensuring zero operational interruption. | **Implemented** |
| **Merchandiser Audit Trail** | Merchandisers can review, verify, and override AI classifications. All corrections are logged with timestamps in an `AuditLog` table. | **Implemented** |
| **Demo Account Switcher** | Navbar testing toolbar enabling evaluators to switch between standard pre-seeded demo accounts. Explicitly executes real backend logins with demo credentials. | **Implemented** |
| **Environment Rate Limiter** | Prevents brute-force attacks in production (100 req/15m) while providing high quotas during local development (5,000 req/15m) to avoid developer lockouts. | **Implemented** |

> **Honesty & Transparency Note on Architectural Boundaries:**
> - **Offline Synchronization:** The mobile floor UI informs supervisors when connectivity drops. True background ServiceWorker queueing with IndexedDB offline-to-online sync is architected for v2.
> - **Cloud Object Storage:** Supervisor photos are currently stored in local disk storage (`backend/uploads`) with Multer type and size validation. Production architecture specifies an S3/Cloud Storage presigned URL pipeline.

---

## 4. User Roles & Permission Matrix

| Action / Resource | Merchandiser (`MERCHANDISER`) | Supervisor (`SUPERVISOR`) | Buyer (`BUYER`) | Administrator (`ADMIN`) |
|---|:---:|:---:|:---:|:---:|
| **View Production Board** | Full factory view | Scoped to unit | Hidden (redirects to portal) | Full factory view |
| **Create New Orders** | Yes | No | No | Yes |
| **Edit Orders & TNA Milestones** | Yes | No | No | Yes |
| **Delete Orders** | No | No | No | Yes |
| **Submit Daily Floor Updates** | No | Yes (assigned unit only) | No | Yes |
| **Upload Floor Photographs** | No | Yes | No | Yes |
| **Audit/Correct AI Categories** | Yes | No | No | Yes |
| **View Buyer Portal** | Read-only | No | Yes (own orders only) | Full view |
| **Cross-Tenant Order Access** | N/A (factory internal) | Blocked (403) | Blocked (403) | Permitted |
| **Global Recalculate Trigger** | No | No | No | Yes |

---

## 5. Technology Stack

### Frontend
- **Framework:** React 19.3
- **Language:** TypeScript 5.7
- **Build Tool:** Vite 8.3
- **Styling:** Tailwind CSS v4, `@tailwindcss/vite`
- **Routing:** React Router v7
- **HTTP Client:** Axios 1.21 (with credentials and error interceptors)
- **Icons:** Lucide React
- **Testing:** Vitest 5.1, React Testing Library, JSDOM

### Backend
- **Runtime:** Node.js (v18+, verified on Node v20/v24)
- **Framework:** Express 4.21
- **Language:** TypeScript 5.7
- **ORM:** Prisma Client 5.22
- **Database:** PostgreSQL 14+ (Local PostgreSQL 17 or Cloud Neon/Supabase)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser`
- **Security:** Helmet, CORS, Express-Rate-Limit (Environment-Aware)
- **File Uploads:** Multer (image/jpeg, image/png, image/webp; 5 MB limit)
- **Validation:** Zod 3.24
- **Testing:** Vitest 3.2, Supertest

### AI & NLP Services
- **Primary Engine:** Google Gemini API (`@google/generative-ai`)
- **Fallback Engine:** Deterministic Tamil & English regex pattern dictionary

---

## 6. Screenshots & Interface Overview

| View | Target Persona | Key Functionality |
|---|---|---|
| **Production Board** | Merchandiser / Admin | Real-time KPI summaries, active PO list, progress bars, risk badges (`On Track`, `At Risk`, `Delayed`), and grouping by Buyer, Unit, or Month. |
| **Delay Analysis Modal** | Merchandiser / Buyer | Transparent formula audit: Planned Qty, Completed Qty, Actual Rate, Required Rate, and human-readable explanation. |
| **Supervisor Mobile Screen** | Factory Floor Supervisor | Android-optimized touch interface for quick piece-count entry, Tamil note field, and photo proof attachment. |
| **Buyer Tracking Portal** | Overseas Apparel Buyer | Tenant-isolated order list, stage progress indicators, ex-factory countdown, and approved assembly photographs. |
| **AI Classification Audit** | Merchandiser | Inline review and correction interface for supervisor notes with audit logging. |

*(To capture live screenshots for submission documentation, run the application locally and capture images using your preferred screenshot tool).*

---

## 7. Local Development Setup (Windows 11 Friendly)

### Prerequisites
- **Node.js:** v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm:** v9.0.0 or higher
- **PostgreSQL:** v14 or higher (service running on `localhost:5432`)
- **Git:** v2.30+

### Step 1: Clone the Repository
```powershell
git clone https://github.com/ayanali0249/knittrack-production-tracker.git
cd knittrack-production-tracker
```

### Step 2: Backend Setup
```powershell
cd backend
npm install
```

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Ensure `backend/.env` has your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/knittrack?schema=public"
JWT_SECRET="knittrack-secure-production-jwt-secret-min-32-chars-key-2026"
JWT_EXPIRES_IN="24h"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
GEMINI_API_KEY=""
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=5
```
*(Note: If `GEMINI_API_KEY` is empty, KnitTrack automatically activates its rule-based Tamil keyword classifier without errors).*

### Step 3: Database Migration & Seeding
```powershell
# Generate Prisma Client
npx prisma generate

# Synchronize PostgreSQL schema
npx prisma db push

# Seed assessment sample data (7 orders, 8 users, realistic milestones)
npm run db:seed
```

### Step 4: Frontend Setup
Open a second terminal window:
```powershell
cd frontend
npm install
```

### Step 5: Start the Development Servers
In Terminal 1 (Backend):
```powershell
cd backend
npm run dev
# Backend starts at http://localhost:3001
```

In Terminal 2 (Frontend):
```powershell
cd frontend
npm run dev
# Frontend starts at http://localhost:5173
```

Open your browser at **`http://localhost:5173`**.

---

## 8. Seeded Assessment Demo Accounts

The database seed script initializes standard persona accounts matching the Tiruppur export workflow. 

The top navigation bar includes an automated **Demo Persona Switcher** for one-click grading convenience:

| Role | Email | Password | Persona & Production Unit Scope |
|---|---|---|---|
| **Merchandiser** | `merch@knittrack.com` | `merch123` | **Priya Sundaram** — Full factory visibility, order creation, TNA editing, delay analysis, AI audit. |
| **Supervisor (Unit 1)** | `supervisor1@knittrack.com` | `super123` | **K. Murugan** — Angeripalayam Main Unit; floor updates, photo proof, unit-scoped. |
| **Supervisor (Unit 2)** | `supervisor2@knittrack.com` | `super123` | **S. Selvaraj** — Kangeyam Road Unit; floor updates, unit-scoped. |
| **Buyer (Company B)** | `buyer.b@knittrack.com` | `buyer123` | **Sarah Johnson** — Company B (UK); strictly views `B-PO-88213` and `B-PO-88240`. |
| **Buyer (Company C)** | `buyer.c@knittrack.com` | `buyer123` | **Hans Mueller** — Company C (Germany); strictly views `C-PO-0488`. |
| **System Admin** | `admin@knittrack.com` | `admin123` | **System Administrator** — User administration, audit logs, order deletion, global recalculation. |

> **Evaluation Note:** The demo switcher performs an explicit backend logout and re-authenticates with the selected demo credentials. It is provided for evaluation convenience and is not an account-impersonation feature.

---

## 9. Automated Testing & Verification

The project enforces end-to-end type safety, unit verification, and API security tests with **86 automated tests (100% passing)**.

### Running Backend Tests
```powershell
cd backend
npm test
```

**Backend Test Suites (82 tests passing):**
- `src/__tests__/delay.test.ts` (24 tests): 5-day business week logic, elapsed days, required run rates, zero-rate safeguards, and risk boundary thresholds.
- `src/__tests__/ai.test.ts` (13 tests): Colloquial Tamil phrases, bilingual notes, rule-based keyword fallback, and audit logging.
- `src/__tests__/orders.test.ts` (20 tests): PO CRUD, stage sequencing, Zod input validation, duplicate PO rejections, and supervisor scoping.
- `src/__tests__/auth.test.ts` (12 tests): Login validation, password verification, HttpOnly cookie issuance, token expiration, and session retrieval.
- `src/__tests__/rbac_isolation.test.ts` (13 tests): Role privilege boundaries, cross-role API rejection (403), Buyer B vs Buyer C tenant data isolation, supervisor unit isolation, and session clearing on logout.

### Running Frontend Tests
```powershell
cd frontend
npm test
```

**Frontend Test Suites (4 tests passing):**
- `src/__tests__/StatusBadge.test.tsx` (4 tests): Status badge semantic color rendering (`On Track`, `At Risk`, `Delayed`, AI category badges).

### Production Build Verification
```powershell
# Verify backend production build
cd backend
npm run build
# Result: tsc compiles cleanly with 0 errors

# Verify frontend production build
cd ../frontend
npm run build
# Result: tsc -b && vite build compiles cleanly with 0 errors
```

---

## 10. Security Architecture

1. **Authentication:** Stateless JSON Web Tokens (JWT) signed with HMAC SHA-256 and stored in `HttpOnly`, `SameSite=Lax` cookies, preventing XSS token exfiltration.
2. **Server-Side Authorization (RBAC):** Every protected endpoint executes server-side role verification (`requireRole`) before invoking business logic. Roles are never accepted from request parameters or client headers.
3. **Multi-Tenant Data Isolation:** Tenant isolation is enforced at the database query layer (`where: { buyerId: req.user.buyerId }`). Buyers cannot access another brand's purchase orders, production timelines, or delay predictions.
4. **Environment-Aware Rate Limiting:** 
   - **Production:** 100 requests / 15 minutes per IP on general API routes; 10 login attempts / 15 minutes on auth routes.
   - **Development:** 5,000 requests / 15 minutes on general API routes; 200 attempts / 15 minutes on auth routes to support iterative manual testing and React StrictMode double mounts.
5. **SQL Injection Prevention:** Prisma ORM utilizes parameterized SQL queries exclusively.
6. **Input Validation:** Strict Zod schemas sanitize all incoming payloads before processing.
7. **File Upload Security:** Multer enforces an image-only whitelist (`image/jpeg`, `image/png`, `image/webp`) and a strict 5 MB file size limit.
8. **Session Invalidation:** `POST /api/auth/logout` clears the authentication cookie with RFC 6265 compliant cookie attributes.

---

## 11. Known Limitations & Roadmap

1. **ServiceWorker Offline Queueing (v2):** Mobile supervisor floor updates currently require an active internet connection. A ServiceWorker with IndexedDB background sync is planned for intermittent factory Wi-Fi environments.
2. **Cloud Media Storage (v2):** Local file storage (`backend/uploads`) is used for local assessment self-containment. Production deployment will integrate an AWS S3 / Cloud Storage presigned URL pipeline.
3. **Automated Buyer Notifications:** AI-generated automated messaging to external buyers is intentionally excluded. In export merchandising, buyer notifications must be reviewed by senior merchandisers before dispatch to maintain client trust.

---

## 12. Documentation & References

- **[Deployment Runbook (`deployment.md`)](deployment.md):** Complete operational guide covering local setup, PostgreSQL service configuration, production hosting (Render, Railway, Neon, Vercel), troubleshooting, and maintenance.
- **[Technical Design Document (`Technical_Design_Document.docx`)](Technical_Design_Document.docx):** Enterprise software architecture specification detailing the problem statement, business domain, database schema, mathematical delay model, and security controls.

---

## 13. Author & Submission Information

- **Author:** Ayan Ali
- **GitHub:** [https://github.com/ayanali0249](https://github.com/ayanali0249)
- **LinkedIn:** [https://www.linkedin.com/in/ayanali0249](https://www.linkedin.com/in/ayanali0249)
- **Portfolio:** [https://ayan-ali-0249.netlify.app](https://ayan-ali-0249.netlify.app)
- **Project URL:** [https://github.com/ayanali0249/knittrack-production-tracker](https://github.com/ayanali0249/knittrack-production-tracker)
- **Assessment:** Isocode Labs Software Engineering Intern Take-Home Assessment
