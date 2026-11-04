# KnitTrack — Knitwear Exporter Production Order-Tracking Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20.19%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-102%2F102%20Passing%20(100%25)-brightgreen?logo=vitest&logoColor=white)](https://vitest.dev/)

> **Repository:** [https://github.com/ayanali0249/knittrack-production-tracker](https://github.com/ayanali0249/knittrack-production-tracker)  
> **Documentation:** [Technical Design Document (DOCX)](KnitTrack_Technical_Design_Document.docx) • [Technical Design Document (PDF)](docs/assets/KnitTrack_Technical_Design_Document.pdf) • [Deployment Guide](deployment.md)  
> **Author:** Ayan Ali ([GitHub](https://github.com/ayanali0249) • [LinkedIn](https://www.linkedin.com/in/ayanali0249) • [Portfolio](https://ayan-ali-0249.netlify.app))  
> **Assessment Context:** Isocode Labs Software Engineering Intern Take-Home Assessment — *Knitwear Exporter Production Order-Tracking App with Buyer View*

---

## 1. Project Overview & Objectives

In Tiruppur, Tamil Nadu—India's primary knitwear export cluster—apparel manufacturers coordinate high-volume garment orders across multi-facility production stages: **Cutting**, **Printing / Embroidery**, **Stitching**, **Washing**, **Finishing**, and **Packing**.

Traditionally, export manufacturing operations face three recurring operational challenges:
1. **Floor Communication Silos:** Factory supervisors across distributed units report shift counts verbally or via paper logs, leading to untracked work and delayed status updates.
2. **Latent Delay Discovery:** Production bottlenecks (such as fabric shortages or sewing machine breakdowns) are uncovered days before the ex-factory date, risking expensive emergency airfreight penalties.
3. **High Communication Overhead:** Overseas buyers continuously email merchandisers for work-in-progress percentages, stage milestones, and garment assembly photographs.

**KnitTrack** is a full-stack production tracking and visibility system engineered for knitwear apparel exporters. It provides:
- A centralized **Production Order Management Board** with on-demand status, run rates, and risk indicators.
- An explainable, **Deterministic Delay Prediction Engine** calculating required vs. actual daily production rates using a 5-day business week model.
- A **Touch-Optimized Mobile Floor Update Screen** for factory floor supervisors with quick-fill quantity buttons, photo proof attachments, Tamil/English note logging, and **offline-first IndexedDB queueing with `clientRequestId` idempotency** for uninterrupted logging during factory network dead spots.
- An **AI-Assisted Tamil & English Note Classifier** configured for Google Gemini (`gemini-3.8-flash`) with an in-memory keyword regex fallback that categorizes floor delay reasons.
- A **Tenant-Isolated Buyer Tracking Portal** offering international apparel buyers on-demand milestone progress, shipment countdowns, approved assembly photos, and **merchandiser-approved advisories** while strictly hiding internal costs, margins, unapproved warnings, and other brands' orders.

---

## 2. System Architecture

KnitTrack follows a decoupled four-tier client-server architecture with strict separation of concerns, end-to-end TypeScript type safety, and row-level tenant data isolation:

![System Architecture](docs/assets/figure1_system_architecture.png)

### Architectural Flow (Mermaid)

```mermaid
flowchart TD
    subgraph ClientTiers["Client Presentation Tier (React 19 + TypeScript + Vite)"]
        MD["Merchandiser Dashboard<br/>(Full Order & TNA Control)"]
        SF["Supervisor Floor UI<br/>(Mobile Touch, Photo Upload)"]
        BP["Buyer Read-Only Portal<br/>(Tenant-Isolated Orders)"]
    end

    subgraph SecurityGateway["Security & API Gateway (Express 4 + TypeScript)"]
        CORS["CORS & Helmet Security Headers"]
        RL["Environment-Aware Rate Limiter<br/>(Dev: 5000 / Prod: 100 req/15m)"]
        AUTH["HttpOnly Cookie JWT Authentication"]
        RBAC["Server-Side RBAC Guard Middleware"]
        ZOD["Zod Schema Validation & Multer"]
    end

    subgraph CoreServices["Backend Application Layer (Domain Services)"]
        OS["Order & TNA Milestone Service"]
        PS["Production Update & Floor Service"]
        DE["Deterministic Delay Prediction Engine<br/>(5-Day Mon-Fri Business Math)"]
        AI["Tamil/English AI Note Classifier<br/>(Gemini 3.8 Flash + Deterministic Fallback)"]
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

## 3. Order Lifecycle & Floor Execution Workflow

Orders move through sequential Time-and-Action (TNA) milestones, with daily supervisor progress updates and automated pace calculations:

![Order Lifecycle Workflow](docs/assets/figure3_order_lifecycle.png)

---

## 4. Implemented Feature Matrix

| Feature | Implementation Details | Status |
|---|---|:---:|
| **Purchase Order Lifecycle** | Full CRUD for export purchase orders: PO number, style name, buyer assignment, production unit allocation, colour, structured size breakdowns (`S`, `M`, `L`, `XL`), total quantity, and ex-factory dates. PO deletion restricted to Administrators. | **Implemented** |
| **TNA Milestone Tracking** | Sequential Time-and-Action stages (`Cutting`, `Printing`, `Stitching`, `Washing`, `Finishing`, `Packing`) with planned start/end dates and on-demand quantity completion tracking. | **Implemented** |
| **Supervisor Floor Updates** | Mobile-optimized daily count submissions with quick-fill quantity buttons (`+100`, `+250`, `+500`, `+1000`), factory floor notes, and camera/photo attachment pipeline. | **Implemented** |
| **Duplicate Submission Prevention** | Compound unique constraint `[stageId, supervisorId, date]` prevents double-counting shift outputs on the same day. | **Implemented** |
| **Deterministic Delay Engine** | Mathematical run-rate engine evaluating 5-day business weeks (Mon–Fri). Computes Actual Run Rate, Required Run Rate, Estimated Completion Date, and Projected Delay Days. | **Implemented** |
| **Transparent Delay Explanations** | Modal breakdown detailing exact formulas, elapsed production days, pace pressure factors, and plain-English operational summaries. | **Implemented** |
| **Buyer Tracking Portal** | Read-only view for overseas buyers displaying active purchase orders, stage progress bars, ex-factory countdowns, and approved assembly photos. | **Implemented** |
| **Tenant Data Isolation** | Query-level database scoping (`where: { buyerId: req.user.buyerId }`). Prevents Buyer B from reading or querying Buyer C orders, timelines, or delay analyses. | **Implemented** |
| **Server-Side RBAC** | Role-based authorization (`ADMIN`, `MERCHANDISER`, `SUPERVISOR`, `BUYER`) enforced in route middleware; roles are sourced solely from verified JWT and database records. | **Implemented** |
| **AI Tamil Note Classification** | NLP classification for colloquial Tamil and English floor notes into 8 export delay categories (machine breakdown, labour shortage, material shortage, power outage, etc.). | **Implemented** |
| **Deterministic AI Fallback** | In-memory Tamil & English keyword dictionary automatically engages if the Gemini API key is missing or unreachable, ensuring uninterrupted floor logging. | **Implemented** |
| **Merchandiser Audit Trail** | Merchandisers can review, verify, and override AI classifications. All corrections are logged with timestamps in an `AuditLog` table. | **Implemented** |
| **Demo Persona Switcher** | Navbar testing toolbar enabling evaluators to switch between standard pre-seeded demo accounts. Explicitly executes real backend logins with demo credentials. | **Implemented** |
| **Environment Rate Limiter** | Prevents brute-force attacks in production (100 req/15m) while providing high quotas during local development (5,000 req/15m) to avoid developer lockouts. | **Implemented** |

> **Architectural Transparency & Scope Boundaries:**
> - **Offline Synchronization:** The mobile floor UI informs supervisors when connectivity drops. True background ServiceWorker queueing with IndexedDB offline-to-online sync is architected for v2.
> - **Media Storage:** Supervisor photos are currently stored in local disk storage (`backend/uploads`) with Multer type and size validation. Production architecture specifies an S3/Cloud Storage presigned URL pipeline.

---

## 5. Delay Prediction Methodology & Calendar Model

The delay engine avoids opaque statistical models in favor of transparent, explainable run-rate arithmetic:

![Delay Prediction Engine](docs/assets/figure4_delay_prediction.png)

### Mathematical Formulas

1. **Actual Production Rate:**
   $$\text{Actual Run Rate (pcs/day)} = \frac{\text{Completed Quantity to Date}}{\text{Elapsed Business Days}}$$

2. **Required Production Rate:**
   $$\text{Required Run Rate (pcs/day)} = \frac{\text{Remaining Quantity}}{\text{Remaining Business Days to Planned End Date}}$$

3. **Projected Completion Date & Delay:**
   $$\text{Estimated Business Days Needed} = \left\lceil \frac{\text{Remaining Quantity}}{\text{Actual Run Rate}} \right\rceil$$
   $$\text{Projected Delay Days} = \text{Projected End Date} - \text{Planned End Date}$$

### Semantic Risk Categories

| Risk Badge | Condition | Operational Meaning |
|---|---|---|
| **`ON_TRACK`** | Projected Delay $\le 0$ days | Production is meeting or exceeding required pace to hit milestone deadline. |
| **`AT_RISK`** | Projected Delay between $1$ and $2$ days | Minor pace shortfall; manageable via shift rebalancing or overtime. |
| **`DELAYED`** | Projected Delay $> 2$ days, or past deadline with remaining WIP | Significant bottleneck; requires merchandiser intervention or buyer negotiation. |

### Operational Assumptions
- **5-Day Business Week:** Production schedules, lead times, and run-rate projections operate strictly on Monday through Friday working days. Saturday and Sunday are excluded from elapsed and remaining business-day counts.
- **Calendar Boundaries:** Public holidays and regional factory calendar closures are not modeled in this calculation engine as an intentional domain simplification.
- **Completed Orders:** Orders where all stages have completed 100% of planned quantities prior to deadline evaluate to `ON_TRACK` with 0 delay days (e.g., sample order `C-PO-0512`).

---

## 6. AI Note Classification & Gemini Integration

Factory line supervisors in Tiruppur frequently log production delay notes in colloquial Tamil, English, or mixed Tanglish.

### Architecture & Supported Categories

The backend classifies supervisor notes into 8 standardized industry categories:
1. `Machine breakdown` (மெஷின் பழுது, மோட்டார் கோளாறு, broken needle)
2. `Labour shortage` (தொழிலாளர்கள் பற்றாக்குறை, ஆள் வரவில்லை, operator absent)
3. `Material shortage` (துணி வரவில்லை, நூல் தட்டுப்பாடு, fabric/yarn shortage)
4. `Quality issue` (தையல் சரியில்லை, நிற மாற்றம், stitching defect, shade variation)
5. `Power outage` (மின்சாரம் தடை, கரண்ட் இல்லை, generator issue)
6. `Supplier delay` (பிரிண்டிங் லேட், வாஷிங் தாமதம், vendor delay)
7. `Weather disruption` (மழை, வெள்ளம், heavy rain, cyclone)
8. `Other` (unspecified administrative remarks)

### Gemini Model Lifecycle & Offline Fallback Integrity

- **Configured Target Model:** **`gemini-3.8-flash`** (configured in [`backend/src/services/ai.service.ts`](backend/src/services/ai.service.ts) using `@google/generative-ai`).
- **Google Deprecation Lifecycle:** Google officially retired `gemini-1.5-flash` in late 2025 and shut down `gemini-2.0-flash` on June 1, 2026. The backend codebase has been migrated to `gemini-3.8-flash`.
- **Offline / Local Assessment Fallback:** In the local evaluation environment where `GEMINI_API_KEY` is not configured, the system automatically routes notes through an embedded in-memory Tamil & English regex pattern dictionary (`TAMIL_KEYWORDS`).
- **Verification Boundary:** Live external cloud API integration has **not** been claimed as tested without an active API key. The deterministic regex fallback is the verified, functional path in this evaluation environment, passing all 13 unit tests in `src/__tests__/ai.test.ts`.

---

## 7. User Roles & Access Control (RBAC)

![RBAC & Tenant Isolation](docs/assets/figure5_rbac_tenant_isolation.png)

Identity and privileges are established via HMAC SHA-256 JWTs stored in `HttpOnly` cookies and verified against database records on every request:

| Capability | Merchandiser (`MERCHANDISER`) | Supervisor (`SUPERVISOR`) | Buyer (`BUYER`) | Admin (`ADMIN`) |
|---|:---:|:---:|:---:|:---:|
| **View Production Board** | Full factory view | Scoped to assigned unit | Hidden (redirects to portal) | Full factory view |
| **Create New Purchase Orders** | Yes | No | No | Yes |
| **Edit Orders & Milestones** | Yes | No | No | Yes |
| **Delete Purchase Orders** | No | No | No | Yes |
| **Submit Shift Production Counts** | No | Yes (assigned unit only) | No | Yes |
| **Attach Garment Photographs** | No | Yes | No | Yes |
| **Audit & Override AI Categories** | Yes | No | No | Yes |
| **View Buyer Portal** | Read-only | No | Yes (own brand POs only) | Full view |
| **Cross-Tenant Order Access** | Internal | Blocked (403) | Blocked (403) | Permitted |
| **Global Recalculate Trigger** | No | No | No | Yes |

---

## 8. Relational Data Model

Normalized to Third Normal Form (3NF) to ensure referential integrity, prevent update anomalies, and enforce tenant isolation:

![Database ER Diagram](docs/assets/figure2_database_er.png)

### Key Entities & Integrity Constraints
- `ProductionOrder`: Master purchase order record with buyer relation, style name, quantity, colour, size breakdown JSON (`S`, `M`, `L`, `XL`), and ex-factory date.
- `OrderStage`: Sequential TNA milestones (`Cutting`, `Printing`, `Stitching`, `Washing`, `Finishing`, `Packing`) with planned start/end dates and stage order sequence.
- `ProductionUpdate`: Daily floor counts with compound unique constraint `@@unique([stageId, supervisorId, date])` blocking duplicate submissions.
- `User`: Accounts with bcrypt-hashed credentials, role enum (`ADMIN`, `MERCHANDISER`, `SUPERVISOR`, `BUYER`), and unit/buyer scoping foreign keys.
- `Buyer`: Tenant entities (e.g., Company A, Company B, Company C) providing row-level scoping boundaries.
- `AuditLog`: Immutable history of merchandiser overrides on AI-classified categories.

---

## 9. Technology Stack

| Layer | Technology | Version | Architectural Role |
|---|---|---|---|
| **Frontend Framework** | React | `v19.3.0` | Reactive component tree, SPA routing, desktop analytics, mobile touch forms |
| **Language (Full-Stack)** | TypeScript | `v5.7.3` | End-to-end static typing across DTOs, API contracts, and database models |
| **Build Tool** | Vite | `v8.3.5` | Sub-2-second production bundling, HMR, optimized asset splitting |
| **Styling** | Tailwind CSS | `v4.0.0` | Zero-runtime utility styling with responsive mobile/desktop breakpoints |
| **Backend Runtime** | Node.js | `v20.19.0+` (verified on `v24.14.1`) | Event-driven I/O model for concurrent supervisor submissions |
| **Web Framework** | Express | `v4.21.2` | RESTful API routing, middleware chaining, error boundary handling |
| **Database Engine** | PostgreSQL | `v14+` (verified on `v17.2`) | ACID relational storage, foreign key cascades, compound unique indexes |
| **ORM / Query Builder** | Prisma ORM | `v5.22.0` / `v6.2.1` | Type-safe parameterized queries, declarative schema migrations |
| **Authentication** | JWT & Bcrypt | `9.0.2` / `2.4.3` | HMAC SHA-256 tokens in HttpOnly cookies; salted password hashing |
| **Input Validation** | Zod | `v3.24.1` | Runtime schema validation sanitizing incoming API payloads |
| **AI Integration** | Google Generative AI | `@google/generative-ai` `0.24.0` | Configured for `gemini-3.8-flash` with in-memory regex fallback |
| **Test Runners** | Vitest & Supertest | `v3.2.7` / `v7.0.0` | In-memory unit, integration, and HTTP security endpoint verification |

---

## 10. Local Development Setup (Windows 11 Friendly)

### Prerequisites
- **Node.js:** `v20.19.0` or higher (required by Vite 8.3; verified on `v24.14.1`)
- **npm:** `v9.0.0` or higher
- **PostgreSQL:** `v14.0` or higher (running on `localhost:5432`)
- **Git:** `v2.30.0` or higher

### Step 1: Clone the Repository
```powershell
git clone https://github.com/ayanali0249/knittrack-production-tracker.git
cd knittrack-production-tracker
```

### Step 2: Backend Configuration
```powershell
cd backend
npm install
```

Create `backend/.env` using the provided template:
```powershell
Copy-Item .env.example .env
```

Configure `backend/.env` with your local settings (use secure placeholders):
```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/knittrack?schema=public"

# Authentication Secrets (generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET="YOUR_SECURE_RANDOM_JWT_SECRET_PLACEHOLDER_MIN_32_CHARS"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Google Gemini AI (Optional - leave empty to use offline regex fallback)
GEMINI_API_KEY=""

# File Uploads & Rate Limiting
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=5
RATE_LIMIT_API_MAX=5000
RATE_LIMIT_AUTH_MAX=200
```

### Step 3: Database Migration & Seeding
```powershell
# Generate Prisma Client
npx prisma generate

# Synchronize schema with PostgreSQL
# (Note: inspect changes first; db push applies declarative schema directly)
npx prisma db push

# Seed assessment sample data (7 orders, 8 users, realistic milestones)
npm run db:seed
```

### Step 4: Frontend Configuration
In a second terminal window:
```powershell
cd frontend
npm install
```

Create `frontend/.env` (optional, defaults to port 3001):
```env
VITE_API_URL="http://localhost:3001/api"
```

### Step 5: Start Development Servers
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

## 11. Seeded Assessment Demo Accounts

The database seed initializes standard persona accounts matching the Tiruppur export workflow. 

The top navigation bar includes an automated **Demo Persona Switcher** for one-click grading convenience (executes real backend authentication):

| Role | Email | Password | Persona & Production Unit Scope |
|---|---|---|---|
| **Merchandiser** | `merch@knittrack.com` | `merch123` | **Priya Sundaram** — Full factory visibility, order creation, TNA editing, delay analysis, AI audit. |
| **Supervisor (Unit 1)** | `supervisor1@knittrack.com` | `super123` | **K. Murugan** — Angeripalayam Main Unit; floor updates, photo proof, unit-scoped. |
| **Supervisor (Unit 2)** | `supervisor2@knittrack.com` | `super123` | **S. Selvaraj** — Kangeyam Road Unit; floor updates, unit-scoped. |
| **Buyer (Company B)** | `buyer.b@knittrack.com` | `buyer123` | **Sarah Johnson** — Company B (UK); strictly views `B-PO-88213` and `B-PO-88240`. |
| **Buyer (Company C)** | `buyer.c@knittrack.com` | `buyer123` | **Hans Mueller** — Company C (Germany); strictly views `C-PO-0488` and `C-PO-0512`. |
| **System Admin** | `admin@knittrack.com` | `admin123` | **System Administrator** — User administration, audit logs, order deletion, global recalculation. |

---

## 12. Automated Testing & Verification Results

The project enforces end-to-end type safety, unit verification, offline queue testing, and API security tests with **102 automated tests (100% passing)**.

### Running Backend Tests
```powershell
cd backend
npm test
```

**Verified Backend Test Suites (89 tests passing across 6 suites, Exit Code: 0):**
- `src/__tests__/delay.test.ts` (24 tests): 5-day business week logic, elapsed days, required run rates, zero-rate safeguards, and risk boundary thresholds.
- `src/__tests__/ai.test.ts` (13 tests): Colloquial Tamil phrases, bilingual notes, rule-based keyword fallback, and audit logging.
- `src/__tests__/orders.test.ts` (20 tests): PO CRUD, stage sequencing, Zod input validation, duplicate PO rejections, and supervisor scoping.
- `src/__tests__/auth.test.ts` (12 tests): Login validation, password verification, HttpOnly cookie issuance, token expiration, and session retrieval.
- `src/__tests__/rbac_isolation.test.ts` (13 tests): Role privilege boundaries, cross-role API rejection (403), Buyer B vs Buyer C tenant data isolation, supervisor unit isolation, and session clearing on logout.
- `src/__tests__/buyer_approval.test.ts` (7 tests): Merchandiser warning approval, revocation, server-side filtering (unapproved floor warnings hidden from buyers), buyer modification rejection, and `clientRequestId` idempotency deduplication.

### Running Frontend Tests
```powershell
cd frontend
npm test
```

**Verified Frontend Test Suites (13 tests passing across 2 suites, Exit Code: 0):**
- `src/__tests__/StatusBadge.test.tsx` (4 tests): Status badge semantic color rendering (`On Track`, `At Risk`, `Delayed`, AI category badges).
- `src/__tests__/offlineQueue.test.ts` (9 tests): IndexedDB queueing when offline, persistent offline state, automatic sync on network reconnection, FIFO queue ordering, retry on network errors, idempotency preservation via `clientRequestId`, and 401/403 safe retention without data loss.

### Production Build Verification
```powershell
# Backend TypeScript typecheck
cd backend
npx tsc --noEmit
# Exit Code: 0 (compiles cleanly with 0 errors)

# Frontend production build
cd ../frontend
npm run build
# Exit Code: 0 (tsc -b && vite build compiles cleanly in 2.24s)
```

---

## 13. REST API Overview

| Method | Endpoint | Authorized Roles | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates user; issues HttpOnly JWT cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clears JWT cookie |
| `GET` | `/api/auth/me` | Authenticated | Returns authenticated user profile |
| `GET` | `/api/orders` | Merchandiser, Supervisor, Admin | Paginated orders (Supervisor scoped to unit) |
| `POST` | `/api/orders` | Merchandiser, Admin | Creates new PO with stages and size ratios |
| `GET` | `/api/orders/:id` | Merchandiser, Supervisor, Buyer, Admin | Order detail and stages (Buyer strictly scoped) |
| `PUT` | `/api/orders/:id` | Merchandiser, Admin | Updates PO metadata and stage dates |
| `DELETE` | `/api/orders/:id` | Admin only | Restrictively deletes PO and associated stages |
| `POST` | `/api/production/updates` | Supervisor, Admin | Submits daily shift count, photo, note, and `clientRequestId` idempotency key |
| `PUT` | `/api/production/updates/:id/approve-warning` | Merchandiser, Admin | Toggles `buyerWarningApproved` status; records audit trail |
| `GET` | `/api/production/timeline/:id` | Merchandiser, Supervisor, Buyer, Admin | Historical shift update log for an order |
| `GET` | `/api/dashboard/stats` | Merchandiser, Admin | Factory-wide throughput KPIs and delay counts |
| `GET` | `/api/dashboard/delay/:orderId` | Merchandiser, Buyer, Admin | Transparent mathematical delay explanation |
| `POST` | `/api/dashboard/recalculate` | Admin only | Manually triggers factory-wide delay re-computation |
| `POST` | `/api/ai/classify` | Merchandiser, Supervisor, Admin | Classifies supervisor note into standard category |
| `PUT` | `/api/ai/correct/:updateId` | Merchandiser, Admin | Overrides category and records audit trail |

---

## 14. Security Architecture

1. **HttpOnly Cookie Authentication:** JWT session tokens are stored in `HttpOnly`, `SameSite=Lax` cookies, preventing JavaScript XSS token exfiltration.
2. **Server-Side RBAC Enforcement:** Every protected route executes server-side role verification middleware (`requireRole`) before accessing business logic. Roles are never accepted from request headers or client bodies.
3. **Multi-Tenant Data Isolation:** Tenant isolation is enforced at the database query layer (`where: { buyerId: req.user.buyerId }`). Buyers cannot access another brand's purchase orders, production timelines, or delay predictions.
4. **Environment-Aware Rate Limiting:**
   - **Production:** 100 requests / 15 minutes per IP on general API routes; 10 login attempts / 15 minutes on auth routes.
   - **Development:** 5,000 requests / 15 minutes on general API routes; 200 attempts / 15 minutes on auth routes to avoid local developer lockouts during testing.
5. **SQL Injection Prevention:** Prisma ORM utilizes parameterized SQL queries exclusively.
6. **Input Validation:** Strict Zod schemas sanitize all incoming payloads before processing.
7. **File Upload Security:** Multer enforces an image-only MIME whitelist (`image/jpeg`, `image/png`, `image/webp`) and a strict 5 MB file size limit.
8. **Session Invalidation:** `POST /api/auth/logout` clears the authentication cookie with RFC 6265 compliant cookie attributes.

---

## 15. Known Limitations & Roadmap

1. **Closed-Browser Background Sync:** Offline queueing, persistence, and auto-sync on reconnect are fully implemented with IndexedDB and `clientRequestId` idempotency. Synchronization while the browser tab is entirely closed requires the experimental ServiceWorker Background Sync API.
2. **Cloud Media Storage (v2):** Local file storage (`backend/uploads`) is used for local assessment self-containment. Production deployment will integrate an AWS S3 / Cloud Storage presigned URL pipeline.
3. **Automated Buyer Notifications:** AI-generated automated messaging to external buyers is intentionally excluded. In export merchandising, buyer notifications must be reviewed by senior merchandisers before dispatch to maintain client trust.

---

## 16. Assessment Deliverables & Links

- **[Technical Design Document (DOCX)](KnitTrack_Technical_Design_Document.docx):** Complete 24-page architectural specification detailing problem domain, system design, database schema, mathematical delay model, offline-first queueing, and security controls.
- **[Technical Design Document (PDF)](docs/assets/KnitTrack_Technical_Design_Document.pdf):** Rendered 24-page visual PDF of the Technical Design Document.
- **[Deployment Runbook (`deployment.md`)](deployment.md):** Complete operational guide covering local setup, PostgreSQL service configuration, production hosting, troubleshooting, and maintenance.
- **Submission Archive:** `KnitTrack_Submission_Documentation.zip` (contains strictly `KnitTrack_Technical_Design_Document.docx` and `deployment.md`, size: ~350 KB, strictly under 25 MB).

---

## 17. Author & Submission Information

- **Author:** Ayan Ali
- **GitHub:** [https://github.com/ayanali0249](https://github.com/ayanali0249)
- **LinkedIn:** [https://www.linkedin.com/in/ayanali0249](https://www.linkedin.com/in/ayanali0249)
- **Portfolio:** [https://ayan-ali-0249.netlify.app](https://ayan-ali-0249.netlify.app)
- **Project URL:** [https://github.com/ayanali0249/knittrack-production-tracker](https://github.com/ayanali0249/knittrack-production-tracker)
- **Assessment:** Isocode Labs Software Engineering Intern Take-Home Assessment (Knitwear Exporter Order-Tracking System with Buyer View)
