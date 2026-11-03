import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  convertInchesToTwip,
  ShadingType,
} from 'docx';
import fs from 'fs';
import path from 'path';

async function generateTDD() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 22, // 11pt
            color: '1E293B',
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 32, // 16pt
            bold: true,
            color: '1E3A8A', // Dark Navy
            font: 'Arial',
          },
          paragraph: {
            spacing: { before: 280, after: 140 },
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 26, // 13pt
            bold: true,
            color: '3B82F6', // Blue
            font: 'Arial',
          },
          paragraph: {
            spacing: { before: 200, after: 100 },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            text: 'TECHNICAL DESIGN DOCUMENT (TDD)',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            run: { size: 38, bold: true, color: '0F172A' },
          }),
          new Paragraph({
            text: 'KnitTrack — Production Order-Tracking System for Knitwear Exporters',
            alignment: AlignmentType.CENTER,
            run: { size: 24, italics: true, color: '475569' },
            spacing: { after: 280 },
          }),

          // Metadata Callout Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Company: ', bold: true }),
                          new TextRun('Isocode Labs Assessment (Software Engineering Intern)\n'),
                          new TextRun({ text: 'Client Context: ', bold: true }),
                          new TextRun('Company A, Tiruppur, Tamil Nadu (Knitwear Exporter, ₹95–110 Cr Revenue)\n'),
                          new TextRun({ text: 'GitHub Project URL: ', bold: true }),
                          new TextRun('https://github.com/ayanali0249/knittrack-production-tracker\n'),
                          new TextRun({ text: 'Application URL: ', bold: true }),
                          new TextRun('Local Dev: http://localhost:5173 | Production: Ready for Cloud Deploy (Vercel/Render)\n'),
                          new TextRun({ text: 'Date: ', bold: true }),
                          new TextRun('November 2026'),
                        ],
                      }),
                    ],
                    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // 1. Executive Summary
          new Paragraph({ text: '1. Executive Summary', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              'KnitTrack is an enterprise-grade production order tracking platform designed for Company A, a knitwear garment exporter based in Tiruppur, Tamil Nadu, India. The company operates three owned manufacturing facilities, engages subcontracted printing and washing units, employs 900 factory floor operators, and serves prestigious apparel buyers across the UK and the European Union. KnitTrack replaces error-prone spreadsheets, unrecorded phone updates, and delayed email communications with a centralized, real-time tracking engine featuring deterministic delay predictions, low-overhead mobile update collection for factory supervisors, an AI-powered Tamil/English note classifier, and strict tenant-isolated read-only buyer visibility.',
          }),

          // 2. Problem Statement
          new Paragraph({ text: '2. Problem Statement', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              'Company A faced four operational bottlenecks that directly threatened buyer relationships and on-time ex-factory delivery:\n' +
              '• Fragmented Merchandising: Production orders and size breakdowns were maintained in offline spreadsheets, creating data discrepancies across teams.\n' +
              '• Floor Information Silos: Supervisors in the three Tiruppur manufacturing units communicated daily counts via informal telephone calls, resulting in double-counting and untracked work.\n' +
              '• High Communication Overhead: International buyers regularly emailed merchandisers seeking progress percentages and fabric assembly photographs.\n' +
              '• Latent Delay Discovery: Production bottlenecks (such as sewing machine breakdowns or fabric shortages) were uncovered only days prior to the ex-factory date when recovery was impossible without expensive airfreight.',
          }),

          // 3. Goals and Non-Goals
          new Paragraph({ text: '3. Goals and Non-Goals', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: 'System Goals (In Scope):', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text:
              '• Provide role-based access control (RBAC) covering Merchandisers, Supervisors, Buyers, and Administrators with strict server-side authorization.\n' +
              '• Standardize Time-and-Action (TNA) milestones across standard knitwear stages: Cutting, Stitching, Printing, Washing, Finishing, Packing, and Shipment readiness.\n' +
              '• Offer an exceptionally lightweight mobile-first update screen designed for low-end Android smartphones used on Tiruppur factory floors.\n' +
              '• Implement a transparent, explainable delay prediction model that calculates required vs actual daily run rates without black-box approximations.\n' +
              '• Integrate real NLP AI classification for colloquial Tamil and English floor notes, with a deterministic rule-based fallback.\n' +
              '• Enforce cryptographic tenant data isolation ensuring buyers cannot access any order details, styles, or photographs belonging to other brands.',
          }),
          new Paragraph({ text: 'Non-Goals (Out of Scope for MVP):', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text:
              '• Full ERP accounting, payroll, or raw material purchasing ledger.\n' +
              '• Biometric floor worker attendance clock-in integration.\n' +
              '• Automated autonomous messaging to external buyers (all communication remains reviewed by merchandisers).',
          }),

          // 4. Assumptions
          new Paragraph({ text: '4. Assumptions [EXPLICITLY LABELED]', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              '• [ASSUMPTION-1: Working Days] Production schedules and run-rate calculations are evaluated on standard Monday through Friday business days (5 days/week), excluding weekends (Saturday and Sunday). Past deadlines with remaining work automatically flag as DELAYED.\n' +
              '• [ASSUMPTION-2: Stage Dependencies] Garment manufacturing follows a sequential flow where milestone progress is tracked per stage. Overlapping stages are supported via configured planned start dates.\n' +
              '• [ASSUMPTION-3: AI Fallback Model] If the external Google Gemini API is unreachable, times out, or has no configured API key, the system activates a deterministic rule-based Tamil keyword classifier to ensure uninterrupted floor logging.\n' +
              '• [ASSUMPTION-4: Time Zone] All ex-factory milestones, planned dates, and daily updates are evaluated in Indian Standard Time (IST, UTC+05:30).\n' +
              '• [ASSUMPTION-5: Media Storage] In development environments, uploaded floor photos are stored in local disk volumes; in enterprise production, the architecture specifies S3-compatible cloud object storage with presigned URLs.',
          }),

          // 5. System Architecture
          new Paragraph({ text: '5. System Architecture', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              'KnitTrack follows a decoupled three-tier enterprise client-server architecture with strict separation of concerns:\n' +
              '1. Presentation Layer: React 18 Single Page Application built with TypeScript, Vite, Tailwind CSS, and Lucide Icons. Features responsive layouts for desktop merchandising dashboards and low-bandwidth touch layouts for Android mobile phones.\n' +
              '2. Application Layer: Node.js Express service built with TypeScript. Follows a layered architecture (Routes -> Middleware -> Controllers -> Services -> ORM). All endpoints enforce authentication, RBAC, Zod schema validation, and rate limiting.\n' +
              '3. Persistence Layer: PostgreSQL relational database managed through Prisma ORM. Utilizes strict foreign keys, unique constraints on PO numbers, compound unique constraints preventing duplicate daily submissions, and indexed query paths.',
          }),

          // 6. Architecture Diagram (ASCII / Text Specification)
          new Paragraph({ text: '6. Architecture Diagram', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              '+-----------------------------------------------------------------------------------------+\n' +
              '|                                   CLIENT TIERS                                          |\n' +
              '|  [Merchandiser Desktop]       [Supervisor Android Mobile]       [Buyer Read-Only Portal] |\n' +
              '+-----------------------------------------------------------------------------------------+\n' +
              '                                             │ HTTPS / JSON / Cookies\n' +
              '                                             ▼\n' +
              '+-----------------------------------------------------------------------------------------+\n' +
              '|                              EXPRESS BACKEND GATEWAY                                    |\n' +
              '|  • Helmet & CORS Protection   • Express Rate Limiter   • HttpOnly Cookie JWT Auth       |\n' +
              '|  • Server-Side RBAC Guards    • Zod Validation Schemas • Multer MIME / Size Validator   |\n' +
              '+-----------------------------------------------------------------------------------------+\n' +
              '        │                                 │                                 │\n' +
              '        ▼                                 ▼                                 ▼\n' +
              ' [Order & TNA Service]          [Delay Prediction Engine]         [AI Classifier Service]  \n' +
              '  - PO CRUD & Sizes               - 5-Day Business Day Math         - Google Gemini Flash  \n' +
              '  - Stage Status & Qty            - Required vs Actual Rate         - Tamil Keyword Fallback\n' +
              '  - Tenant Buyer Scoping          - Projected Completion Date       - Merchandiser Audit Log\n' +
              '+-----------------------------------------------------------------------------------------+\n' +
              '                                             │\n' +
              '                                             ▼ Prisma ORM (Type-Safe SQL)\n' +
              '+-----------------------------------------------------------------------------------------+\n' +
              '|                                POSTGRESQL DATABASE                                      |\n' +
              '|  • User (Roles, Units)   • Buyer (Tenant Isolation)  • ProductionUnit (Tiruppur Units)  |\n' +
              '|  • ProductionOrder (PO)  • OrderStage (Milestones)   • ProductionUpdate (Daily Counts)  |\n' +
              '|  • ProductionPhoto       • BuyerAccessToken          • AuditLog (Classification Edits)  |\n' +
              '+-----------------------------------------------------------------------------------------+',
          }),

          // 7. Database Schema & Data Integrity
          new Paragraph({ text: '7. Database Schema & Data Integrity', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              'The PostgreSQL relational schema is normalized to 3NF and enforces business invariants at the database level:\n' +
              '• ProductionOrder: Unique constraint on poNumber. Foreign keys to Buyer, ProductionUnit, and User (creator). Size ratios stored in structured JSON format with total quantity validation.\n' +
              '• OrderStage: Represents sequential TNA milestones. Contains orderId, stageName, sequence, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, plannedQuantity, completedQuantity, and status enum (NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED). Unique constraint on [orderId, stageName].\n' +
              '• ProductionUpdate: Stores daily piece counts logged by factory supervisors. Contains orderStageId, supervisorId, date, quantity, originalNote, aiCategory, aiConfidence, and correctedCategory. Enforces compound unique constraint on [orderStageId, supervisorId, date] to prevent double-counting.\n' +
              '• Tenant Isolation: The User model maintains nullable foreign keys to buyerId and productionUnitId. The backend middleware intercepts requests and automatically appends tenant WHERE clauses.',
          }),

          // 8. Production Delay Prediction Engine
          new Paragraph({ text: '8. Production Delay Prediction Engine', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              'KnitTrack completely rejects opaque, arbitrary risk scores in favor of a deterministic, mathematically transparent calculation model designed around Tiruppur industry dynamics.\n\n' +
              'Core Calculation Formulas:\n' +
              '1. Remaining Quantity = Planned Quantity - Completed Quantity\n' +
              '2. Elapsed Business Days = Business days elapsed since stage actual start date (skipping Saturday and Sunday)\n' +
              '3. Actual Daily Run Rate = Completed Quantity / Elapsed Business Days (when elapsed > 0)\n' +
              '4. Remaining Business Days = Business days remaining until stage planned end date\n' +
              '5. Required Daily Run Rate = Remaining Quantity / Remaining Business Days (when remaining days > 0)\n' +
              '6. Estimated Completion Days = Remaining Quantity / Actual Daily Run Rate (when actual rate > 0)\n' +
              '7. Projected Completion Date = Reference Date + Estimated Completion Days (in business days)\n' +
              '8. Projected Delay Days = Projected Completion Date - Planned End Date\n\n' +
              'Deterministic Risk Classification Criteria:\n' +
              '• ON_TRACK (Green): Stage is completed OR Projected Delay <= 0 days.\n' +
              '• AT_RISK (Amber): Projected Delay is between 1 and 3 business days OR Required Run Rate exceeds 120% of Actual Run Rate (indicating unsustainable pressure).\n' +
              '• DELAYED (Red): Projected Delay exceeds 3 business days OR planned end date has passed with remaining unproduced quantity.\n\n' +
              'Plain-English Transparency Output:\n' +
              'The system generates human-readable explanations displayed directly on merchandiser and buyer views, for example: "At the current production rate of 350 pieces/day, this order requires approximately 15 production days, but only 10 days remain. The order is projected to finish 5 days late."',
          }),

          // 9. AI Tamil Production Note Classification
          new Paragraph({ text: '9. AI Tamil Production Note Classification', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              'In Tiruppur knitwear units, factory floor supervisors commonly speak Tamil or write bilingual floor notes. KnitTrack integrates Google Gemini 1.5 / 2.0 Flash to translate and classify unstructured supervisor logs into eight standardized export delay reason categories:\n' +
              '1. Machine breakdown (e.g., "மெஷின் பழுதாகிவிட்டது", motor failure, needle break)\n' +
              '2. Labour shortage (e.g., "தொழிலாளர்கள் குறைவாக உள்ளனர்", operator absenteeism)\n' +
              '3. Material shortage (e.g., "துணி இன்னும் வரவில்லை", yarn or fabric delay)\n' +
              '4. Quality issue (e.g., "தையல் சரியில்லை", shade variation, measurement defect)\n' +
              '5. Power outage (e.g., "மின்சாரம் தடைப்பட்டது", generator failure)\n' +
              '6. Supplier delay (subcontracted printing/washing delays)\n' +
              '7. Weather disruption (monsoon flooding, transport disruption)\n' +
              '8. Other\n\n' +
              'Resilience & Fallback Architecture:\n' +
              '• The original Tamil/English supervisor note is permanently preserved in the database (originalNote).\n' +
              '• If the Gemini API key is not configured, or if an API call exceeds 8000ms or encounters rate limits, KnitTrack switches to a deterministic Tamil keyword dictionary pattern matcher, marking fallbackMode: true.\n' +
              '• Merchandisers can audit and manually correct the AI classification through an inline modal. All corrections are logged with timestamps in an AuditLog table.\n' +
              '• Security Guardrail: Under no circumstances can AI change production piece counts, alter ex-factory dates, or send unapproved messages to buyers.',
          }),

          // 10. Buyer Read-Only Portal
          new Paragraph({ text: '10. Buyer Read-Only Portal & Tenant Isolation', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              'The buyer portal is engineered with strict multi-tenant isolation principles:\n' +
              '• Authentication & Scoping: When a buyer logs in (e.g. Company B UK or Company C Germany), the backend extracts user.buyerId from the cryptographically verified JWT.\n' +
              '• Strict Backend Enforcement: All database queries for /api/buyer/orders enforce { where: { buyerId: req.user.buyerId } }. Even if a buyer modifies URL parameters, access to other brands is rejected with HTTP 403 Forbidden.\n' +
              '• Endpoint Tenant Protection: Cross-tenant IDOR protection is enforced across all related endpoints: order detail (/api/orders/:id), order timeline (/api/production/timeline/:id), and delay analysis (/api/dashboard/delay/:id) all reject unauthorized buyer access with HTTP 403 Forbidden.\n' +
              '• Read-Only Guarantees: The buyer route handlers expose only GET endpoints. Post, put, patch, and delete methods do not exist for the buyer role.\n' +
              '• Visual Scope: Buyers view milestone progress bars, ex-factory countdowns, and approved assembly photos without exposure to internal cost sheets, factory unit margins, or other client data.',
          }),

          // 11. Security Architecture
          new Paragraph({ text: '11. Security Architecture & Controls', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              '• Password Security: Passwords hashed with bcryptjs using a work factor of 10 salt rounds.\n' +
              '• Session Security: Stateless JSON Web Tokens (JWT) stored in HttpOnly, SameSite=Lax cookies to prevent Cross-Site Scripting (XSS) token exfiltration. Logout explicitly clears the cookie with standard RFC 6265 options.\n' +
              '• Server-Side Authorization: Dedicated RBAC middleware (requireRole) verifies permissions before executing controller logic. Roles are sourced solely from verified database records.\n' +
              '• Injection Protection: Prisma ORM uses parameterized SQL queries exclusively, eliminating SQL injection vulnerabilities.\n' +
              '• Input Validation: Zod schemas validate all incoming request bodies, query strings, and route parameters.\n' +
              '• Environment-Aware Rate Limiting: Sensitive endpoints are rate-limited via express-rate-limit. In production, strict limits (100 general API requests, 10 login attempts per 15 min) prevent brute-force attacks. In development, thresholds expand to 5,000 API requests and 200 auth attempts to support iterative manual evaluation.\n' +
              '• File Upload Hardening: Multer middleware verifies file MIME types (restricting to image/jpeg, image/png, image/webp) and enforces a strict 5 MB size cap.\n' +
              '• HTTP Header Hardening: Helmet middleware injects standard security headers (X-Content-Type-Options, Strict-Transport-Security, Frameguard).',
          }),

          // 12. Testing Strategy & Results
          new Paragraph({ text: '12. Testing Strategy & Results', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              'The testing strategy emphasizes automated verification of business logic, delay mathematics, and role permissions:\n\n' +
              '• Business Logic Unit Tests (Vitest): 24 tests in delay.test.ts verifying 5-day business week calculations, actual run rates, required run rates, zero-output handling, past-deadline conditions, and deterministic risk boundaries.\n' +
              '• AI Classification Tests (Vitest): 13 tests in ai.test.ts validating Tamil phrases, English notes, whitespace handling, rule-based fallback, and merchandiser correction audit logging.\n' +
              '• Authentication Tests (Supertest): 12 tests in auth.test.ts validating credential verification, cookie issuance, token decoding, and RBAC rejections.\n' +
              '• Order API Integration Tests (Supertest): 20 tests in orders.test.ts validating order creation, duplicate PO rejection, supervisor unit scoping, and buyer data isolation.\n' +
              '• RBAC & Data Isolation Security Tests (Supertest): 13 tests in rbac_isolation.test.ts validating cross-role API rejection (403), Buyer B vs Buyer C isolation, timeline scoping, supervisor unit isolation, and session invalidation on logout.\n' +
              '• Frontend Component Tests: 4 tests in StatusBadge.test.tsx validating semantic color badges and labels.\n\n' +
              'SUMMARY: 86 total automated tests executed and passing with 100% pass rate (82 backend + 4 frontend). Both backend and frontend production builds compile with zero TypeScript errors.',
          }),

          // 13. Deployment Architecture
          new Paragraph({ text: '13. Deployment Architecture', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              '• Frontend Deployment: Vercel or Netlify Single Page Application hosting with CDN edge caching.\n' +
              '• Backend Deployment: Render, Railway, or AWS Elastic Beanstalk containerized Node.js service.\n' +
              '• Database Deployment: Neon.tech, Supabase, or AWS RDS managed PostgreSQL instance.\n' +
              '• Continuous Integration: Automated npm test and npm run build verification prior to deployment merges.',
          }),

          // 14. What Was Cut & Trade-Offs
          new Paragraph({ text: '14. What Was Cut and Why', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              '1. Offline PWA Synchronization: While the mobile update UI is built with touch targets optimized for low-end Android phones, full offline IndexedDB sync via ServiceWorker was deferred to v2. Reason: Preserving bulletproof database consistency and preventing race conditions was prioritized over offline caching for the MVP.\n' +
              '2. Direct Buyer Messaging: AI-generated direct email or SMS alerts to buyers were explicitly cut. In international knitwear apparel exports, all communication regarding delays must be reviewed and curated by senior merchandisers to protect client relationships.\n' +
              '3. Cloud S3 Storage: S3 presigned URL integration was replaced with local Multer disk storage in development to keep the local evaluation setup self-contained without requiring AWS credentials.',
          }),

          // 15. Future Improvements (Roadmap)
          new Paragraph({ text: '15. Future Improvements (Post-MVP Roadmap)', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              '• ServiceWorker & IndexedDB offline queuing for supervisor floor updates when factory Wi-Fi is intermittent.\n' +
              '• IoT sewing machine sensor integration (MQTT protocol) for real-time automatic stitch count reporting.\n' +
              '• PDF generation of buyer inspection certificates and Time-and-Action Gantt chart summaries.\n' +
              '• WhatsApp Business API integration for supervisor daily shift reminder notifications.',
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve('c:/Users/ayana/OneDrive/Documents/Project', 'Technical_Design_Document.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Generated Technical Design Document at: ${outputPath}`);
}

generateTDD().catch((err) => {
  console.error('Failed to generate TDD docx:', err);
  process.exit(1);
});
