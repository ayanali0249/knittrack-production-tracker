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
  Header,
  Footer,
  PageNumber,
  ImageRun,
  PageBreak,
} from 'docx';
import fs from 'fs';
import path from 'path';

// Palette Constants (Professional Enterprise SaaS)
const COLOR_PRIMARY_NAVY = '1E3A8A';   // #1E3A8A Dark Navy Blue
const COLOR_SECONDARY_BLUE = '2563EB'; // #2563EB Blue 600
const COLOR_SLATE_TITLE = '0F172A';    // #0F172A Slate 900
const COLOR_SLATE_DARK = '1E293B';     // #1E293B Slate 800
const COLOR_SLATE_MUTED = '475569';    // #475569 Slate 600
const COLOR_SLATE_BORDER = 'CBD5E1';   // #CBD5E1 Slate 300
const COLOR_BG_SHADED = 'F8FAFC';      // #F8FAFC Slate 50
const COLOR_BG_HIGHLIGHT = 'EFF6FF';   // #EFF6FF Blue 50

const rootDir = path.resolve(__dirname, '../..');
const assetsDir = path.join(rootDir, 'docs/assets');

function p(text: string, options: { bold?: boolean; italics?: boolean; color?: string; spacingAfter?: number; spacingBefore?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: options.align || AlignmentType.LEFT,
    spacing: {
      before: options.spacingBefore ?? 0,
      after: options.spacingAfter ?? 140,
      line: 276, // 1.15 line spacing
    },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italics,
        color: options.color || COLOR_SLATE_DARK,
        font: 'Segoe UI',
        size: 21, // 10.5 pt
      }),
    ],
  });
}

function h1(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
  });
}

function h2(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
  });
}

function h3(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
  });
}

function bullet(title: string, body: string) {
  return new Paragraph({
    spacing: { after: 100, line: 260 },
    bullet: { level: 0 },
    children: [
      new TextRun({ text: title + ': ', bold: true, color: COLOR_SLATE_DARK, font: 'Segoe UI', size: 21 }),
      new TextRun({ text: body, color: COLOR_SLATE_DARK, font: 'Segoe UI', size: 21 }),
    ],
  });
}

function callout(title: string, body: string, bg: string = COLOR_BG_HIGHLIGHT, borderColor: string = COLOR_SECONDARY_BLUE) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              left: { style: BorderStyle.SINGLE, size: 24, color: borderColor },
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
            },
            shading: { fill: bg, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: title, bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 21 })],
              }),
              new Paragraph({
                spacing: { after: 0, line: 260 },
                children: [new TextRun({ text: body, color: COLOR_SLATE_DARK, font: 'Segoe UI', size: 20 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function figureImage(imagePath: string, captionText: string, width: number = 590, height: number = 380) {
  const imgBuffer = fs.readFileSync(imagePath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 80 },
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: { width, height },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: captionText,
          italics: true,
          bold: true,
          color: COLOR_SLATE_MUTED,
          font: 'Segoe UI',
          size: 19,
        }),
      ],
    }),
  ];
}

function createStyledTable(headers: string[], rows: string[][], colWidths?: number[]) {
  const tableRows: TableRow[] = [];

  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map((h, i) =>
        new TableCell({
          width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
          shading: { fill: COLOR_PRIMARY_NAVY, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', font: 'Segoe UI', size: 19 })],
            }),
          ],
        })
      ),
    })
  );

  rows.forEach((row, rIdx) => {
    const isEven = rIdx % 2 === 0;
    tableRows.push(
      new TableRow({
        children: row.map((cellText, i) =>
          new TableCell({
            width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
            shading: { fill: isEven ? 'FFFFFF' : COLOR_BG_SHADED, type: ShadingType.CLEAR },
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SLATE_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SLATE_BORDER },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { line: 240 },
                children: [new TextRun({ text: cellText, color: COLOR_SLATE_DARK, font: 'Segoe UI', size: 19 })],
              }),
            ],
          })
        ),
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

async function buildDocument() {
  console.log('Generating KnitTrack Technical Design Document (Comprehensive Specification)...');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', size: 21, color: COLOR_SLATE_DARK },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 30, bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI' },
          paragraph: { spacing: { before: 340, after: 140 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 25, bold: true, color: COLOR_SECONDARY_BLUE, font: 'Segoe UI' },
          paragraph: { spacing: { before: 240, after: 100 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 22, bold: true, color: COLOR_SLATE_DARK, font: 'Segoe UI' },
          paragraph: { spacing: { before: 180, after: 80 } },
        },
      ],
    },
    sections: [
      // =========================================================================
      // COVER PAGE SECTION (NO HEADERS/FOOTERS)
      // =========================================================================
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.0),
              right: convertInchesToTwip(1.0),
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(1.0),
            },
          },
        },
        children: [
          // Top Banner Callout with GitHub Repository URL
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_SECONDARY_BLUE },
                      top: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                    },
                    shading: { fill: COLOR_BG_HIGHLIGHT, type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        spacing: { after: 0 },
                        children: [
                          new TextRun({ text: 'GITHUB REPOSITORY: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 19 }),
                          new TextRun({ text: 'https://github.com/ayanali0249/knittrack-production-tracker', bold: true, color: COLOR_SECONDARY_BLUE, font: 'Segoe UI', size: 19 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 400 } }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'TECHNICAL DESIGN DOCUMENT',
                bold: true,
                color: COLOR_SECONDARY_BLUE,
                font: 'Segoe UI',
                size: 24,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'KnitTrack',
                bold: true,
                color: COLOR_SLATE_TITLE,
                font: 'Segoe UI',
                size: 60,
              }),
            ],
            spacing: { after: 80 },
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'Production Order-Tracking, Delay Prediction & Offline-Ready Operations System for Knitwear Exporters',
                bold: false,
                color: COLOR_SLATE_MUTED,
                font: 'Segoe UI',
                size: 24,
              }),
            ],
            spacing: { after: 360 },
          }),

          // Metadata Callout Box on Cover Page
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 160, bottom: 160, left: 180, right: 180 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 36, color: COLOR_PRIMARY_NAVY },
                      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SLATE_BORDER },
                      right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SLATE_BORDER },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SLATE_BORDER },
                    },
                    shading: { fill: COLOR_BG_SHADED, type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        spacing: { after: 70 },
                        children: [
                          new TextRun({ text: 'Assessment Brief: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 20 }),
                          new TextRun({ text: 'Software Engineering Intern Take-Home Assessment', font: 'Segoe UI', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 70 },
                        children: [
                          new TextRun({ text: 'Organization: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 20 }),
                          new TextRun({ text: 'Isocode Labs', font: 'Segoe UI', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 70 },
                        children: [
                          new TextRun({ text: 'Domain Context: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 20 }),
                          new TextRun({ text: 'Company A (Illustrative Assessment Scenario), Tiruppur Knitwear Exporter', font: 'Segoe UI', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 70 },
                        children: [
                          new TextRun({ text: 'Author: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 20 }),
                          new TextRun({ text: 'Ayan Ali (Candidate ID: ayanali0249)', font: 'Segoe UI', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 70 },
                        children: [
                          new TextRun({ text: 'GitHub Repository: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 20 }),
                          new TextRun({ text: 'https://github.com/ayanali0249/knittrack-production-tracker', color: COLOR_SECONDARY_BLUE, font: 'Segoe UI', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 70 },
                        children: [
                          new TextRun({ text: 'Document Version: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 20 }),
                          new TextRun({ text: 'Version 2.0 (Complete Implementation Baseline with Offline Queue & Buyer Approval)', font: 'Segoe UI', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 70 },
                        children: [
                          new TextRun({ text: 'Test Verification: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 20 }),
                          new TextRun({ text: '102 Passed / 102 Total (100% Pass Rate across Backend & Frontend)', font: 'Segoe UI', size: 20 }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 0 },
                        children: [
                          new TextRun({ text: 'Date: ', bold: true, color: COLOR_PRIMARY_NAVY, font: 'Segoe UI', size: 20 }),
                          new TextRun({ text: 'November 2026', font: 'Segoe UI', size: 20 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 400 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Prepared for Technical Evaluation by Senior Software Engineers and Technical Hiring Leadership',
                italics: true,
                color: COLOR_SLATE_MUTED,
                font: 'Segoe UI',
                size: 19,
              }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      },

      // =========================================================================
      // MAIN BODY SECTION (WITH HEADERS AND FOOTERS)
      // =========================================================================
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
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: 'KnitTrack — Technical Design Document  |  GitHub: https://github.com/ayanali0249/knittrack-production-tracker',
                    font: 'Segoe UI',
                    size: 15,
                    color: COLOR_SLATE_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SLATE_BORDER }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.LEFT,
                            children: [
                              new TextRun({
                                text: 'CONFIDENTIAL — CANDIDATE SUBMISSION',
                                font: 'Segoe UI',
                                size: 16,
                                color: COLOR_SLATE_MUTED,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_SLATE_BORDER }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: 'Page ', font: 'Segoe UI', size: 16, color: COLOR_SLATE_MUTED }),
                              new TextRun({ children: [PageNumber.CURRENT], font: 'Segoe UI', size: 16, color: COLOR_SLATE_MUTED }),
                              new TextRun({ text: ' of ', font: 'Segoe UI', size: 16, color: COLOR_SLATE_MUTED }),
                              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Segoe UI', size: 16, color: COLOR_SLATE_MUTED }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ---------------------------------------------------------------------
          // DOCUMENT CONTROL & GOVERNANCE
          // ---------------------------------------------------------------------
          h1('Document Control & Governance'),
          p('This document outlines the technical architecture, mathematical formulation, security controls, offline-first execution model, and operational runbook for KnitTrack. All specifications, endpoint contracts, and test counts reflect the actual implementation verified in the codebase.'),
          createStyledTable(
            ['Property', 'Specification Details'],
            [
              ['Document Title', 'KnitTrack System Architecture & Technical Design Document'],
              ['Document Version', '2.0 (Complete Implementation Baseline with Offline Queue & Buyer Approval)'],
              ['Verification Status', 'Verified & Passing (102/102 Automated Tests Passing, 0 Build Errors)'],
              ['Candidate Author', 'Ayan Ali (Software Engineering Intern Candidate)'],
              ['Target Audience', 'Senior Software Engineers, System Architects, Technical Hiring Evaluators'],
              ['GitHub Repository', 'https://github.com/ayanali0249/knittrack-production-tracker'],
              ['Execution Runtime', 'Node.js v20.19.0+ / v24.x LTS (Express 4.21, TypeScript 5.7) | React 19 (Vite 8.3, Tailwind CSS v4)'],
              ['Persistence Layer', 'PostgreSQL 14+ (Verified on PostgreSQL 17) via Prisma ORM 5.22 with 3NF Schema'],
              ['Offline Queueing', 'Client-side IndexedDB queue (with localStorage fallback), FIFO sync, and clientRequestId idempotency deduplication'],
              ['Buyer Advisory Security', 'Merchandiser/Admin approval toggle (buyerWarningApproved) hiding unverified floor warnings from external buyers'],
              ['AI Classifier Architecture', 'Configured for Gemini gemini-3.8-flash; deterministic regex fallback is the tested and active path in local evaluation'],
            ],
            [30, 70]
          ),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // ---------------------------------------------------------------------
          // TABLE OF CONTENTS
          // ---------------------------------------------------------------------
          h1('Table of Contents'),
          createStyledTable(
            ['Section', 'Title', 'Description'],
            [
              ['1.0', 'Executive Summary', 'Operational context, illustrative domain background, and core value proposition'],
              ['2.0', 'Problem Statement', 'Operational bottlenecks: spreadsheet fragmentation, verbal silos, and late delay discovery'],
              ['3.0', 'Product Scope & Invariants', 'Functional boundaries, offline capabilities, explicit non-goals, and core operational assumptions'],
              ['4.0', 'User Roles & Access Control', 'Merchandiser, Supervisor, Buyer, and Admin permissions matrix and endpoint rules'],
              ['5.0', 'Screen-by-Screen UI/UX Design Rationale', 'High-contrast mobile supervisor forms, merchandiser oversight desk, buyer portal, and admin center'],
              ['6.0', 'Functional Architecture & Decomposition', 'Component decomposition across client, gateway, services, and persistence'],
              ['7.0', 'System Architecture Diagram', 'Figure 1: High-Level Four-Tier Architecture Specification'],
              ['8.0', 'Order Lifecycle Workflow', 'Figure 3: Sequential Time-and-Action (TNA) Milestones & Floor Execution'],
              ['9.0', 'Technology Stack Evaluation', 'Selection criteria for React 19, Express, TypeScript, Prisma, and PostgreSQL'],
              ['10.0', 'Relational Data Model', 'Figure 2: 3NF Database Schema, Foreign Keys, and Compound Unique Constraints'],
              ['11.0', 'API Architecture & Contracts', 'RESTful endpoint contracts, request/response validation, and idempotency key specification'],
              ['12.0', 'Security & Tenant Isolation', 'Figure 5: HttpOnly JWTs, RBAC guards, and row-level Buyer data isolation'],
              ['13.0', 'Delay Prediction Engine', 'Figure 4: 5-Day Business Week Mathematical Run-Rate Model & Risk Badges'],
              ['14.0', 'AI Note Classification', 'Gemini gemini-3.8-flash model configuration, retirement lifecycle, and deterministic fallback'],
              ['15.0', 'Offline-First Queue Architecture', 'IndexedDB queue, automatic network reconnection sync, and clientRequestId deduplication'],
              ['16.0', 'Buyer Warning Approval Workflow', 'Server-side filtering, merchandiser approval toggle, and advisory presentation'],
              ['17.0', 'Testing & Verification', '102 automated tests (Vitest/Supertest), build passes, and database checks'],
              ['18.0', 'Deployment & DevOps Runbook', 'Local setup, environment configurations, and production cloud blueprint'],
              ['19.0', 'Limitations & Trade-Offs', 'What was cut for MVP and why (cloud S3 storage, closed-browser background sync)'],
              ['20.0', 'Post-MVP Roadmap', 'V2 milestones: IoT sewing sensors, WhatsApp integration, and PDF exports'],
              ['21.0', 'Conclusion', 'Final architectural summary and evaluation baseline'],
              ['22.0', 'References', 'Repository links, official documentation, and verification scripts'],
            ],
            [12, 38, 50]
          ),

          new Paragraph({ text: '', spacing: { after: 200 } }),

          // ---------------------------------------------------------------------
          // 1. EXECUTIVE SUMMARY
          // ---------------------------------------------------------------------
          h1('1.0 Executive Summary'),
          callout(
            'Illustrative Assessment Scenario Notice',
            'In accordance with the Isocode Labs assessment brief, Company A serves as an illustrative business scenario representing a circular knitwear apparel exporter based in Tiruppur, Tamil Nadu, India. The company manufactures export garments (e.g., crew-neck tees, polo shirts, hoodies) across multiple manufacturing units for international apparel retail buyers in the UK and the European Union. Operational metrics referenced herein reflect design scenario assumptions rather than empirical corporate disclosures.'
          ),
          p('Knitwear export manufacturing is characterized by tightly coupled sequential stages—fabric cutting, screen printing, sewing assembly, garment washing, quality finishing, and packing—bound to rigid ex-factory delivery milestones. Traditionally, apparel exporters track work-in-progress (WIP) through manual spreadsheets, verbal shift-end telephone handoffs, and ad-hoc email communications with overseas retail buyers.'),
          p('KnitTrack replaces these fragmented practices with a structured, resilient operational tracking engine:'),
          bullet('Centralized Merchandising & TNA Management', 'Enables export merchandisers to initialize structured Purchase Orders with multi-size breakdown ratios and sequential Time-and-Action (TNA) milestones.'),
          bullet('Touch-Optimized Mobile Floor Logging with Offline Resilience', 'Equips factory line supervisors with a low-overhead, mobile-friendly interface featuring giant touch targets, quick-increment buttons, and native IndexedDB queueing with idempotency deduplication to log daily shift counts even during factory connectivity blackouts.'),
          bullet('Deterministic Delay Prediction Engine', 'Replaces subjective guesswork with an explainable, 5-day business week run-rate calculation model that flags delays early.'),
          bullet('Bilingual NLP AI Classification Architecture', 'Configured in source code for Google Gemini gemini-3.8-flash (migrated following the retirement of 1.5 Flash in late 2025 and 2.0 Flash on June 1, 2026), with an embedded deterministic Tamil/English regex keyword fallback dictionary that serves as the verified, functional execution path in the offline evaluation environment.'),
          bullet('Merchandiser-Curated Buyer Portal', 'Provides overseas brand buyers with on-demand, query-based milestone transparency and ex-factory countdowns updated on view refresh, strictly scoping data to authorized purchase orders and filtering unapproved floor warnings to prevent unnecessary commercial panic.'),

          // ---------------------------------------------------------------------
          // 2. PROBLEM STATEMENT
          // ---------------------------------------------------------------------
          h1('2.0 Problem Statement'),
          p('Apparel export manufacturers in manufacturing hubs like Tiruppur commonly encounter four operational bottlenecks:'),
          bullet('1. Merchandising Data Fragmentation', 'Purchase orders, style specifications, and size breakdown ratios are frequently kept in independent spreadsheet files. Revisions made by merchandisers are not instantly propagated to cutting rooms and sewing floors, creating risk of mismatch or fabric stockouts.'),
          bullet('2. Floor Information Latency & Double-Counting', 'Factory supervisors often report shift counts verbally or via informal messaging groups at shift end. Outputs risk being double-counted or lost, obscuring real stage progress.'),
          bullet('3. Factory Floor Connectivity Blindspots', 'Industrial sewing and finishing sheds in Tiruppur frequently experience intermittent Wi-Fi and mobile network dead spots. Without offline persistence, shift supervisors cannot log output at the machine line, reverting to memory-based paper notes.'),
          bullet('4. Unfiltered Delay Communication Panic', 'When floor disruptions occur (e.g. temporary thread breakage or needle replacement), raw supervisor notes can trigger undue alarm if broadcast directly to overseas brand buyers without prior merchandising review and mitigation.'),

          // ---------------------------------------------------------------------
          // 3. PRODUCT SCOPE & INVARIANTS
          // ---------------------------------------------------------------------
          h1('3.0 Product Scope, Non-Goals & Core Assumptions'),
          h2('3.1 Implemented Core Features'),
          bullet('Order & TNA Milestone Lifecycle', 'Comprehensive Purchase Order lifecycle management (order creation and status updates by Merchandisers and Admins; deletion restricted strictly to Administrators), including size breakdowns, factory assignments, and sequential stages (Cutting, Stitching, Printing, Washing, Finishing, Packing).'),
          bullet('Offline-First Mobile Floor Logging', 'Single-screen daily logging with client-side IndexedDB persistence, UUIDv4 idempotency keys, automatic FIFO synchronization upon network restoration, and compound unique constraints [stageId, supervisorId, date] preventing duplicate shift submissions.'),
          bullet('Merchandiser Buyer Advisory Workflow', 'Server-side filtering of floor delay notes to protect client relationships. Merchandisers review floor alerts and explicitly toggle buyer visibility, recording actions in an immutable AuditLog.'),
          bullet('Deterministic Delay Prediction Engine', 'Business-day calendar arithmetic calculating actual run rate, required run rate, projected delay days, and semantic risk badges (ON_TRACK, AT_RISK, DELAYED).'),
          bullet('Bilingual NLP AI Classification', 'Integration architecture for Google Gemini gemini-3.8-flash with an offline regex keyword dictionary fallback for Tamil and English floor notes.'),
          bullet('Buyer Portal & Tenant Scoping', 'Read-only access for international buyers with strict row-level database scoping ensuring complete isolation between competing brands.'),

          h2('3.2 Explicit Non-Goals (MVP Boundaries)'),
          bullet('Full ERP Financial Ledger & Payroll', 'KnitTrack focuses strictly on manufacturing operations and WIP tracking; general ledger accounting, invoicing, and wage payroll are deferred.'),
          bullet('Automated Direct Buyer Messaging', 'The system intentionally does not send automated SMS or email delay alerts directly to buyers. In high-value knitwear exports, all client communication regarding delays must be curated and approved by senior merchandisers.'),
          bullet('Closed-Browser Background Sync', 'The current offline queue synchronizes automatically when the browser tab is open; closed-browser background execution via ServiceWorker Background Sync API is reserved for future enterprise iterations.'),

          h2('3.3 Explicit Operational Assumptions'),
          bullet('[ASSUMPTION-1: 5-Day Business Week & Calendar Modeling]', 'Production schedules, run-rate calculations, and delay forecasts operate strictly on standard Monday through Friday business days (5 days/week). Weekends (Saturday and Sunday) are automatically excluded from working-day counts. Public holidays and regional factory calendar closures are not modeled in this calculation engine. Overdue stages with remaining open quantities evaluate as DELAYED.'),
          bullet('[ASSUMPTION-2: Time Zone Baseline]', 'All planned dates, actual shift submissions, and ex-factory milestones are evaluated in Indian Standard Time (IST, UTC+05:30).'),
          bullet('[ASSUMPTION-3: Deterministic AI Fallback as Primary Functional Path]', 'Because GEMINI_API_KEY is not configured in local evaluation, the system automatically activates its embedded deterministic Tamil keyword dictionary regex engine without interrupting floor logging. Live Gemini 3.8 Flash calls remain an optional cloud integration.'),
          bullet('[ASSUMPTION-4: Local Disk Storage in Development]', 'Uploaded garment assembly photos are stored on local disk volumes via Multer in development. Cloud S3-compatible object storage with presigned URLs is specified for enterprise production.'),

          // ---------------------------------------------------------------------
          // 4. USER ROLES & ACCESS CONTROL
          // ---------------------------------------------------------------------
          h1('4.0 User Roles & Access Control Matrix'),
          p('KnitTrack implements server-side Role-Based Access Control (RBAC). User identity and assigned privileges are established exclusively via cryptographically signed JWTs stored in HttpOnly cookies and verified against database records on every request.'),
          createStyledTable(
            ['Role Name', 'Primary User Group', 'Permitted Operational Scope', 'Restricted Boundaries'],
            [
              ['MERCHANDISER', 'Export Merchandisers, Production Planners', 'Create/edit POs, configure TNA milestones, assign units, view all orders, audit AI notes, view run-rate analytics, approve buyer warnings', 'Cannot delete purchase orders (DELETE is Admin only); cannot modify user credentials or database settings'],
              ['SUPERVISOR', 'Factory Floor Line Supervisors', 'View assigned factory unit orders, submit daily piece counts (online or offline), type/voice Tamil floor notes, upload assembly photos', 'Strictly scoped to assigned productionUnitId; cannot create POs, edit milestones, or access buyer data'],
              ['BUYER', 'International Apparel Retailers (UK/EU)', 'Read-only visibility into assigned orders, ex-factory countdown timers, milestone progress bars, approved photos, and approved advisories', 'Strictly scoped to assigned buyerId; zero access to internal unit costs, margins, unapproved warnings, or other buyer orders'],
              ['ADMIN', 'System Administrators, Factory Directors', 'Full platform administrative access, user role provisioning, system configuration, global analytics oversight, order deletion, warning approval', 'Restricted from bypassing audit log immutability'],
            ],
            [15, 25, 35, 25]
          ),

          new Paragraph({ text: '', spacing: { after: 140 } }),

          h2('4.1 Permission Verification Matrix'),
          createStyledTable(
            ['Feature / Endpoint Action', 'ADMIN', 'MERCHANDISER', 'SUPERVISOR', 'BUYER'],
            [
              ['Create New Purchase Order (POST /api/orders)', 'Yes', 'Yes', 'No (403)', 'No (403)'],
              ['Update Order Status (PUT /api/orders/:id)', 'Yes', 'Yes', 'No (403)', 'No (403)'],
              ['Delete Purchase Order (DELETE /api/orders/:id)', 'Yes', 'No (403)', 'No (403)', 'No (403)'],
              ['View Full Company Order List (GET /api/orders)', 'Yes', 'Yes', 'Unit Scoped', 'Tenant Scoped'],
              ['Submit Daily Floor Output (POST /api/production/updates)', 'Yes', 'Yes', 'Yes (Assigned Unit)', 'No (403)'],
              ['Upload Stage Assembly Photo (POST /api/production/upload-photo)', 'Yes', 'Yes', 'Yes (Assigned Unit)', 'No (403)'],
              ['Audit & Correct AI Category (PATCH /api/ai/updates/:id/category)', 'Yes', 'Yes', 'No (403)', 'No (403)'],
              ['Approve Buyer Warning (PUT /api/production/updates/:id/approve-warning)', 'Yes', 'Yes', 'No (403)', 'No (403)'],
              ['Access Tenant Buyer Orders (GET /api/buyer/orders)', 'Yes', 'Yes', 'No (403)', 'Yes (Own POs Only)'],
            ],
            [36, 16, 16, 16, 16]
          ),

          // ---------------------------------------------------------------------
          // 5. SCREEN-BY-SCREEN UI/UX DESIGN RATIONALE
          // ---------------------------------------------------------------------
          h1('5.0 Screen-by-Screen UI/UX Design Rationale & Interface Specifications'),
          p('The user interfaces in KnitTrack are customized specifically to the ergonomics, cognitive load, and environmental constraints of each distinct manufacturing persona:'),

          h2('5.1 Merchandiser Command Center (Desktop High-Density Workspace)'),
          p('Export merchandisers manage dozens of active purchase orders simultaneously across multiple retail brands. The Merchandiser interface is optimized for desktop productivity:'),
          bullet('High-Density Information Architecture', 'Displays comprehensive order data including PO number, buyer code, style name, quantity, unit assignment, and ex-factory dates without excessive vertical whitespace.'),
          bullet('Instant Visual Risk Triaging', 'Prominent color-coded badges (Green = On Track, Amber = At Risk, Red = Delayed) enable instant identification of at-risk orders in the first three seconds of page load.'),
          bullet('Inline Stage Completion Bars', 'Visual milestone progress bars show percentage completion across Cutting, Stitching, Printing, Washing, Finishing, and Packing directly on the dashboard.'),
          bullet('Merchandiser Warning Approval Controls', 'On the Order Detail view, floor updates with detected delays feature a toggle button ("Approve for Buyer" / "Revoke"). Merchandisers retain total editorial control over which operational disruptions are communicated to external brand clients.'),
          bullet('AI Delay Audit Modal', 'One-click modal allowing merchandisers to inspect the AI-classified delay reason and Tamil source text, override incorrect classifications, and log the correction to an immutable audit trail.'),

          h2('5.2 Supervisor Mobile Floor Update Form (High-Contrast, Touch-First Ergonomics)'),
          p('Factory floor supervisors operate in harsh, noisy industrial environments with dusty conditions, dim lighting, and greasy hands. The Supervisor mobile interface is engineered specifically for these physical constraints:'),
          bullet('Single-Column High-Contrast Layout', 'High-contrast typography and borders readable under poor fluorescent shed lighting and bright sunlight.'),
          bullet('Giant Touch Targets (Min 48px)', 'All interactive buttons, dropdowns, and form inputs exceed standard accessibility guidelines (minimum 48x48 pixel hit areas) to prevent accidental taps.'),
          bullet('Quick-Increment Counter Buttons', 'Dedicated "+50", "+100", and "+500" quick-fill buttons allow supervisors to log large production counts with minimal tapping, avoiding tedious keyboard typing.'),
          bullet('Real-Time Connectivity Badge', 'A dynamic status badge at the top of the form clearly indicates network health: a green "Online" badge with pulse indicator when connected, and an amber "Offline — Sync Queued" badge when disconnected.'),
          bullet('Offline Pending Queue Panel', 'When working offline, the interface displays a persistent queue list showing unsynced updates, their timestamps, and a manual "Sync Pending Updates" retry trigger.'),
          bullet('Bilingual Note Input', 'Supports raw colloquial Tamil, Tanglish, or English floor notes without requiring structured category dropdown selection on the floor.'),

          h2('5.3 Buyer Transparency Portal (Curated, Trust-Building Brand View)'),
          p('International apparel retail buyers require clear, reliable delivery progress without exposure to internal factory panic or proprietary unit margins:'),
          bullet('Zero-Distraction Milestone Progress', 'Presents clean progress bars for each manufacturing stage, planned vs. actual completion dates, and a prominent countdown timer to the ex-factory date.'),
          bullet('Confidential Margin Protection', 'All internal manufacturing costs, CMT rates, fabric yields, and line worker details are completely excluded from the buyer view.'),
          bullet('Merchandiser-Approved Advisories', 'Instead of showing unfiltered supervisor complaints, the portal features a dedicated "Merchandiser-Approved Advisories" card. Only warnings that have undergone merchandising review and mitigation planning are visible.'),
          bullet('Verified Assembly Photographs', 'Displays verified quality control and garment assembly photos uploaded by supervisors, providing proof of physical progress without verbal disputes.'),

          h2('5.4 Administrator Control Center (Governance & System Oversight)'),
          p('System administrators require global oversight, user provisioning, and compliance auditing capabilities:'),
          bullet('Factory-Wide Throughput Telemetry', 'Aggregated summary cards displaying total orders, cumulative pieces produced, active bottlenecks, and overall delivery risk distribution.'),
          bullet('Immutable AI Audit Log Viewer', 'Chronological inspection log showing every manual override made to an AI category, recording the author, timestamp, previous value, and new value.'),
          bullet('Exclusive Deletion Authority', 'To protect historical production records and prevent accidental data loss, order deletion is restricted strictly to Administrator users through guarded confirmation dialogs.'),

          // ---------------------------------------------------------------------
          // 6. FUNCTIONAL ARCHITECTURE
          // ---------------------------------------------------------------------
          h1('6.0 Functional Architecture & System Decomposition'),
          p('KnitTrack is engineered as a decoupled, four-tier client-server architecture with separation of concerns:'),
          bullet('Presentation Tier (Client Applications)', 'Single Page Application (SPA) built with React 19, TypeScript, Vite, and Tailwind CSS. Employs responsive layout patterns: desktop-first analytics for merchandising desks and touch-optimized single-screen forms with IndexedDB offline queueing for mobile floor supervisors.'),
          bullet('API Gateway & Security Tier', 'Node.js Express 4.21 server enforcing Helmet HTTP security headers, CORS origin controls, environment-aware rate limiting, HttpOnly cookie JWT authentication, and Zod request body validation.'),
          bullet('Core Domain Application Tier', 'Layered service architecture encapsulating business rules: Order & Milestone Service, Deterministic Delay Prediction Engine, Bilingual NLP AI Classification Service, Supervisor Floor Update Service with idempotency deduplication, and Merchandiser Buyer Approval Service.'),
          bullet('Persistence & Storage Tier', 'PostgreSQL relational database managed via Prisma ORM 5.22, leveraging normalized 3NF schemas, foreign key constraints, and compound unique keys, alongside local file storage for garment assembly photos.'),

          // ---------------------------------------------------------------------
          // 7. SYSTEM ARCHITECTURE DIAGRAM (FIGURE 1)
          // ---------------------------------------------------------------------
          h1('7.0 System Architecture Diagram'),
          p('The following architectural diagram illustrates the client tiers, API gateway middleware guards, domain services, persistence layer, and external integrations:'),
          ...figureImage(
            path.join(assetsDir, 'figure1_system_architecture.png'),
            'Figure 1: High-Level Four-Tier Architecture Specification of KnitTrack Platform',
            590,
            390
          ),
          p('Architecture Narrative & Data Flow:'),
          p('1. Client Ingress: Client applications (Desktop Merchandiser, Mobile Supervisor, External Buyer) communicate via REST APIs exchanging JSON payloads over HTTP/HTTPS. Authentication tokens are transported via browser-managed HttpOnly cookies, mitigating token accessibility from client-side scripts.'),
          p('2. Gateway Pipeline: Incoming requests pass sequentially through: (a) Helmet security header injector, (b) CORS origin validator, (c) Express Rate Limiter, (d) verifyToken JWT cookie decoder, and (e) requireRole authorization guard.'),
          p('3. Service Execution: Controllers validate request bodies against Zod schemas, then delegate execution to isolated domain service classes. Domain services interact with PostgreSQL through Prisma ORM parameterized queries.'),

          // ---------------------------------------------------------------------
          // 8. ORDER LIFECYCLE WORKFLOW (FIGURE 3)
          // ---------------------------------------------------------------------
          h1('8.0 End-to-End Knitwear Order Lifecycle Workflow'),
          p('Knitwear manufacturing requires sequential milestone adherence. The diagram below illustrates the operational progression from purchase order confirmation to ex-factory shipment:'),
          ...figureImage(
            path.join(assetsDir, 'figure3_order_lifecycle.png'),
            'Figure 3: Sequential Time-and-Action (TNA) Milestones & Cross-Functional Workflow',
            590,
            365
          ),
          p('Stage-by-Stage Workflow Breakdown:'),
          bullet('1. Merchandising PO Setup', 'The merchandiser confirms the purchase order, specifies style details, planned start and ex-factory dates, target production unit, and multi-size ratios. Standard TNA milestones (Cutting -> Stitching -> Printing -> Washing -> Finishing -> Packing) are initialized with target quantities.'),
          bullet('2. Cutting Master Initiation', 'Fabric rolls arrive at the designated factory. The cutting master initiates the Cutting stage, logging cut piece counts against planned size ratios.'),
          bullet('3. Subcontract & Stitching Progression', 'Depending on garment styling, cut pieces progress to subcontract printing or washing, or move directly to sewing lines for garment assembly.'),
          bullet('4. Supervisor Daily Logging', 'At shift end, the line supervisor opens the mobile interface, selects the active milestone, enters pieces produced, and submits a floor log. If offline, the update is saved to IndexedDB; once reconnected, it synchronizes automatically with an idempotency key.'),
          bullet('5. AI Classification & Delay Recalculation', 'The submission triggers the bilingual AI classifier (or fallback dictionary) to tag any reported delay reason. Simultaneously, the delay engine recomputes actual vs required run rates, updating order risk status.'),
          bullet('6. Merchandiser Advisory Curation', 'If a floor delay is detected, the merchandiser reviews the issue and decides whether to approve it for buyer visibility.'),
          bullet('7. Buyer On-Demand Tracking', 'The international buyer reviews progress on their dedicated portal, inspecting verified completion percentages, approved advisories, and assembly photos.'),

          // ---------------------------------------------------------------------
          // 9. TECHNOLOGY STACK EVALUATION
          // ---------------------------------------------------------------------
          h1('9.0 Technology Stack & Architectural Justification'),
          p('Every library, framework, and database engine in the KnitTrack stack was chosen based on specific operational requirements:'),
          createStyledTable(
            ['Layer / Component', 'Selected Technology', 'Version', 'Architectural Rationale & Trade-Off Analysis'],
            [
              ['Frontend Framework', 'React / TypeScript', '19.3 / 5.7', 'Component-driven reactive architecture; strict static typing guarantees zero undefined state errors; responsive UI updates on user navigation.'],
              ['Frontend Build Tool', 'Vite', '8.3', 'Fast hot module replacement (HMR), sub-2-second production bundling, optimized asset splitting, and minimal client bundle overhead (406 kB JS / 38 kB CSS). Requires Node.js v20.19.0+.'],
              ['Styling System', 'Tailwind CSS', 'v4.0', 'Utility-first styling with zero CSS runtime overhead; streamlined responsive breakpoints for mobile screens and desktop monitors.'],
              ['Offline Storage', 'IndexedDB API', 'Native W3C', 'Structured, high-capacity client database supporting transactional storage and FIFO queueing during network outages, with localStorage fallback.'],
              ['Backend Runtime', 'Node.js / Express', 'v20.19.0+ / 4.21', 'Event-driven I/O model suitable for concurrent mobile submissions; mature middleware ecosystem for auth, security, and rate limiting.'],
              ['Language', 'TypeScript', '5.7', 'End-to-end type safety between database models, backend DTOs, and frontend API contracts; eliminates runtime property mismatches.'],
              ['Database Engine', 'PostgreSQL', '17.0 (14+ supported)', 'ACID-compliant relational database providing row-level locking, foreign key integrity, compound unique constraints, and high-performance indexed queries.'],
              ['ORM / Query Builder', 'Prisma ORM', '5.22', 'Type-safe database client using parameterized prepared SQL statements; declarative schema migrations; automated relation hydration.'],
              ['Security & Auth', 'bcryptjs / jsonwebtoken', '2.4 / 9.0', 'Bcrypt password hashing (10 salt rounds); stateless HMAC SHA-256 JWT sessions stored in HttpOnly, SameSite=Lax cookies.'],
              ['AI Engine Architecture', 'Google Gemini API / Fallback', '0.24', 'Configured for gemini-3.8-flash (Gemini 1.5 Flash retired in late 2025, Gemini 2.0 Flash shut down June 1, 2026). In this local evaluation environment, the deterministic Tamil/English keyword dictionary fallback is the tested and functional path; live cloud LLM calls are not claimed as verified without an active external API key.'],
              ['Testing Framework', 'Vitest / Supertest', '3.2 / 7.1', 'Fast in-memory test runner executing 102 unit, integration, and security tests in under 3 seconds; Supertest validates HTTP endpoints.'],
            ],
            [18, 18, 10, 54]
          ),

          // ---------------------------------------------------------------------
          // 10. RELATIONAL DATA MODEL (FIGURE 2)
          // ---------------------------------------------------------------------
          h1('10.0 Relational Data Model & Integrity Constraints'),
          p('The KnitTrack database is normalized to Third Normal Form (3NF) to prevent update anomalies and guarantee referential integrity across high-volume factory operations:'),
          ...figureImage(
            path.join(assetsDir, 'figure2_database_er.png'),
            'Figure 2: Relational Entity-Relationship Diagram with Primary/Foreign Keys and Cardinality',
            590,
            370
          ),
          h2('10.1 Entity Dictionary & Structural Constraints'),
          createStyledTable(
            ['Entity Table', 'Primary Key', 'Foreign Keys', 'Key Constraints & Invariants'],
            [
              ['User', 'id (CUID)', 'buyerId -> Buyer, productionUnitId -> ProductionUnit', 'UNIQUE(email); Role enum: ADMIN, MERCHANDISER, SUPERVISOR, BUYER; password stored as bcrypt hash.'],
              ['Buyer', 'id (CUID)', 'None', 'UNIQUE(code); represents external apparel brand clients (e.g., Company B UK, Company C Germany).'],
              ['ProductionUnit', 'id (CUID)', 'None', 'Represents manufacturing factory units with daily piece capacities.'],
              ['ProductionOrder', 'id (CUID)', 'buyerId -> Buyer (CASCADE), productionUnitId -> ProductionUnit, createdById -> User', 'UNIQUE(poNumber); stores styleName, totalQuantity, plannedStartDate, plannedEndDate, exFactoryDate, status enum, and sizeBreakdown JSON.'],
              ['OrderStage', 'id (CUID)', 'orderId -> ProductionOrder (CASCADE)', 'UNIQUE(orderId, stageName); sequence integer (1-6); plannedStartDate/EndDate, actualStartDate/EndDate, plannedQuantity, completedQuantity, status enum.'],
              ['ProductionUpdate', 'id (CUID)', 'orderStageId -> OrderStage (CASCADE), supervisorId -> User', 'COMPOUND UNIQUE(orderStageId, supervisorId, date); UNIQUE(clientRequestId); stores quantity, originalNote, aiCategory, aiConfidence, fallbackMode, buyerWarningApproved, buyerWarningApprovedBy, buyerWarningApprovedAt.'],
              ['ProductionPhoto', 'id (CUID)', 'orderStageId -> OrderStage', 'Stores filePath, caption, uploadedAt; restricted by Multer to image/jpeg, image/png, image/webp with 5MB ceiling.'],
              ['BuyerAccessToken', 'id (CUID)', 'buyerId -> Buyer', 'UNIQUE(token); enables passwordless magic-link authentication for external brand managers.'],
              ['AuditLog', 'id (CUID)', 'updateId -> ProductionUpdate, userId -> User', 'Records previousCategory, newCategory, action type, timestamp whenever a merchandiser overrides an AI category or approves/revokes a buyer warning.'],
            ],
            [16, 12, 28, 44]
          ),

          // ---------------------------------------------------------------------
          // 11. API ARCHITECTURE & CONTRACTS
          // ---------------------------------------------------------------------
          h1('11.0 API Architecture & Security Contracts'),
          p('All KnitTrack endpoints follow RESTful conventions, requiring authentication cookies except for public login and health check routes. Request bodies and query parameters are validated via Zod schemas before reaching service logic.'),
          createStyledTable(
            ['HTTP Method & Path', 'Authorized Roles', 'Zod Payload / Params', 'Description & Tenant Boundary Enforcement'],
            [
              ['POST /api/auth/login', 'Public', '{ email, password }', 'Authenticates credentials via bcrypt, sets HttpOnly token cookie with SameSite=Lax flag, returns user profile.'],
              ['GET /api/auth/me', 'Authenticated', 'None (reads cookie)', 'Validates active session, decodes JWT claims, returns fresh user context including role and tenant bindings.'],
              ['POST /api/auth/logout', 'Authenticated', 'None', 'Clears session cookie using standard RFC 6265 options (expires in past, path=/), invalidating client session.'],
              ['GET /api/orders', 'Merchandiser, Admin, Scoped Users', 'query: { buyerId, status, unitId }', 'Returns paginated list of purchase orders across all facilities with computed run-rate risk badges.'],
              ['POST /api/orders', 'Merchandiser, Admin', '{ poNumber, styleName, buyerId, ... }', 'Creates new PO, initializes size ratios in JSON, and provisions default sequential OrderStage milestones.'],
              ['GET /api/orders/:id', 'Authenticated (Scoped)', 'params: { id }', 'Fetches complete PO details. Enforces tenant check: if role is BUYER, verifies order.buyerId === req.user.buyerId (403 on mismatch).'],
              ['DELETE /api/orders/:id', 'Admin Only', 'params: { id }', 'Deletes purchase order and cascades stage records. Restricted strictly to Administrator role.'],
              ['POST /api/production/updates', 'Supervisor, Merch, Admin', '{ orderStageId, quantity, note, date, clientRequestId }', 'Logs daily pieces with clientRequestId idempotency key. Enforces supervisor unit assignment and compound unique constraint. Triggers AI classification.'],
              ['PUT /api/production/updates/:id/approve-warning', 'Merchandiser, Admin', '{ approved: boolean }', 'Toggles buyerWarningApproved status on floor update. Writes audit trail entry to AuditLog table.'],
              ['POST /api/production/upload-photo', 'Supervisor, Merch, Admin', 'multipart/form-data { photo, stageId }', 'Validates image MIME type and 5MB size limit via Multer; persists to disk and creates ProductionPhoto record.'],
              ['GET /api/production/timeline/:id', 'Authenticated (Scoped)', 'params: { id }', 'Returns chronological stage progression and daily submission logs. Enforces buyer isolation (403 for unauthorized buyers).'],
              ['PATCH /api/ai/updates/:id/category', 'Merchandiser, Admin', '{ category }', 'Updates aiCategory to correctedCategory on production update; writes audit trail entry to AuditLog table.'],
              ['GET /api/buyer/orders', 'Buyer, Merch, Admin', 'None', 'Returns active orders. Injects WHERE buyerId = req.user.buyerId for Buyer role, guaranteeing strict cross-brand isolation.'],
              ['GET /api/dashboard/stats', 'Merchandiser, Admin', 'None', 'Aggregates enterprise KPIs: total active orders, pieces produced, bottleneck stages, and risk distribution (Green/Amber/Red).'],
              ['GET /api/dashboard/delay/:id', 'Authenticated (Scoped)', 'params: { id }', 'Returns mathematical delay analysis. Enforces buyer tenant verification (403 for unauthorized buyers).'],
            ],
            [22, 18, 20, 40]
          ),

          // ---------------------------------------------------------------------
          // 12. SECURITY & TENANT ISOLATION (FIGURE 5)
          // ---------------------------------------------------------------------
          h1('12.0 Authentication, Security Architecture & Tenant Isolation'),
          p('KnitTrack implements server-side defenses designed to enforce authentication, role authorization, and tenant isolation:'),
          ...figureImage(
            path.join(assetsDir, 'figure5_rbac_tenant_isolation.png'),
            'Figure 5: Server-Side RBAC Guard, Token Lifecycle & Row-Level Tenant Isolation Architecture',
            590,
            355
          ),
          h2('12.1 Truthful Explanation of Buyer Tenant Isolation'),
          callout(
            'Implementation Notice: Server-Side Row-Level Scoping vs Marketing Buzzwords',
            'KnitTrack achieves multi-tenant isolation through server-side row-level query scoping and explicit authorization checks—not through "cryptographic tenant partitioning" or multi-database schemas. When a user authenticates, their verified buyerId is bound to the server-signed JWT. Every buyer endpoint injects `where: { buyerId: req.user.buyerId }` into Prisma queries. Detail endpoints (/api/orders/:id, /api/production/timeline/:id, /api/dashboard/delay/:id) query the database and assert that the requested record belongs to the caller’s buyerId, rejecting cross-tenant IDOR tampering with HTTP 403 Forbidden. This mechanism is verified by 13 automated security tests.'
          ),
          p('Core Security Controls:'),
          bullet('HttpOnly Cookie JWT Storage', 'Tokens are stored in HttpOnly, SameSite=Lax cookies, mitigating cookie exfiltration via client-side JavaScript.'),
          bullet('Bcrypt Password Hashing', 'Passwords are encrypted using bcryptjs with a work factor of 10 salt rounds.'),
          bullet('Environment-Aware Rate Limiting', 'Sensitive endpoints are protected via express-rate-limit. In production, general APIs are capped at 100 requests per 15 minutes, and login attempts at 10 per 15 minutes. In development, thresholds expand to 5,000 API requests and 200 auth attempts to facilitate testing.'),
          bullet('File Upload Validation', 'Multer rejects non-image files, strictly enforcing image/jpeg, image/png, and image/webp formats with a 5 MB file size ceiling.'),
          bullet('SQL Injection Mitigation', 'Prisma ORM abstracts all database interactions into parameterized prepared SQL statements, preventing SQL injection vulnerabilities in standard queries.'),

          // ---------------------------------------------------------------------
          // 13. DELAY PREDICTION ENGINE (FIGURE 4)
          // ---------------------------------------------------------------------
          h1('13.0 Deterministic Production Delay Prediction Engine'),
          p('In contrast to opaque machine learning models that generate unexplainable risk scores, KnitTrack implements a transparent, deterministic mathematical model rooted in textile production metrics:'),
          ...figureImage(
            path.join(assetsDir, 'figure4_delay_prediction.png'),
            'Figure 4: Deterministic 5-Day Business Week Mathematical Run-Rate & Delay Prediction Flowchart',
            590,
            375
          ),
          h2('13.1 Mathematical Formulas & Business Rules'),
          p('The calculation engine (implemented in backend/src/lib/delayCalculation.ts) evaluates stages using the following verified formulas:'),
          bullet('Formula 1: Remaining Quantity', 'Remaining Qty = max(0, Planned Quantity - Completed Quantity)'),
          bullet('Formula 2: Elapsed Business Days', 'Business days elapsed between Actual Start Date and Reference Date (Monday through Friday, skipping Saturday and Sunday). If elapsed equals zero, the engine uses 1 to prevent division by zero.'),
          bullet('Formula 3: Actual Daily Run Rate', 'Actual Run Rate = Completed Quantity / Elapsed Business Days'),
          bullet('Formula 4: Remaining Business Days', 'Working days between Reference Date and Planned End Date (skipping Saturday and Sunday).'),
          bullet('Formula 5: Required Daily Run Rate', 'Required Run Rate = Remaining Quantity / Remaining Business Days (when Remaining Days > 0)'),
          bullet('Formula 6: Estimated Completion Days', 'Estimated Completion Days = ceil(Remaining Quantity / Actual Run Rate) (when Actual Rate > 0)'),
          bullet('Formula 7: Projected Completion Date', 'Reference Date + Estimated Completion Days (added sequentially across Monday–Friday business days)'),
          bullet('Formula 8: Projected Delay Days', 'countBusinessDays(Planned End Date, Projected Completion Date)'),

          h2('13.2 Deterministic Risk Categorization Criteria'),
          createStyledTable(
            ['Risk Level', 'Badge Color', 'Triggering Conditions', 'Automated Operational Action'],
            [
              ['ON_TRACK', 'Green (#059669)', 'Stage Completed (Completed >= Planned) OR Projected Delay <= 0 days', 'Normal floor monitoring; no intervention required.'],
              ['AT_RISK', 'Amber (#D97706)', 'Projected Delay between 1 and 3 business days OR Required Run Rate > 120% of Actual Run Rate', 'Alert flagged on merchandiser dashboard; line supervisor notified to rebalance operators or schedule overtime.'],
              ['DELAYED', 'Red (#DC2626)', 'Projected Delay > 3 business days OR Planned End Date passed with remaining unproduced pieces', 'Critical management alert; factory head schedules immediate intervention, line reassignment, or buyer milestone renegotiation.'],
            ],
            [15, 18, 37, 30]
          ),

          // ---------------------------------------------------------------------
          // 14. AI NOTE CLASSIFICATION
          // ---------------------------------------------------------------------
          h1('14.0 AI Tamil & English Floor Note Classification Service'),
          p('Factory line supervisors frequently report floor disruptions in colloquial Tamil, bilingual Tamil-English, or informal English. KnitTrack integrates an NLP pipeline to categorize these notes without rigid dropdown requirements:'),
          h2('14.1 Standardized Delay Categories'),
          createStyledTable(
            ['Export Delay Category', 'Tamil Trigger Phrases (Sample)', 'English Operational Manifestation'],
            [
              ['Machine breakdown', 'மெஷின் பழுதாகிவிட்டது, மோட்டார் எரியவில்லை, ஊசி உடைந்தது', 'Sewing motor burnt, overlock needle breakage, compressor failure'],
              ['Labour shortage', 'தொழிலாளர்கள் வரவில்லை, ஆள் பற்றாக்குறை, ஆபரேட்டர் லீவு', 'Operator absenteeism, post-festival migration, helper shortage'],
              ['Material shortage', 'துணி இன்னும் வரவில்லை, நூல் தட்டுப்பாடு, பட்டன் வரவில்லை', 'Knitted fabric roll delay, yarn mismatch, trim/button stockout'],
              ['Quality issue', 'தையல் சரியில்லை, கறை படிந்துள்ளது, நிற வித்தியாசம்', 'Stitching puckering, shade variation, oil stain rejection in QC'],
              ['Power outage', 'கரண்ட் போய்விட்டது, ஜெனரேட்டர் பழுது, மின் தடை', 'Grid power cut, backup generator fuel delay, phase fault'],
              ['Supplier delay', 'பிரிண்டிங் லேட், வாஷிங் தாமதம், டைங் வரவில்லை', 'Subcontract washing delay, screen printing bottleneck'],
              ['Weather disruption', 'கனமழை, வெள்ளம், போக்குவரத்து தடை', 'Monsoon flooding in Tiruppur, transport truck breakdown'],
              ['Other', 'பொதுவான தாமதம், மேலாளர் உத்தரவு', 'Unspecified management hold or general administrative inquiry'],
            ],
            [22, 38, 40]
          ),

          h2('14.2 Architecture & High-Availability Fallback Mechanism'),
          p('1. Cloud LLM Architecture: Sourced from backend/src/services/ai.service.ts, the backend is configured to invoke Google Gemini gemini-3.8-flash via the @google/generative-ai SDK. According to Google\'s official Gemini API deprecation schedule, Gemini 1.5 Flash was retired in late 2025, and Gemini 2.0 Flash shut down on June 1, 2026. The backend codebase has therefore been migrated to gemini-3.8-flash. In the current assessment environment where GEMINI_API_KEY is not configured, live cloud LLM calls have not been tested or verified. The code configuration is strictly distinguished from live API verification. Instead, the system automatically activates its embedded deterministic regex keyword fallback dictionary, which is the verified and fully functional execution path.'),
          p('2. Deterministic Regex Fallback Engine: When GEMINI_API_KEY is unconfigured, times out (>8000ms), encounters network partition, or triggers rate limits, KnitTrack automatically executes an embedded regex keyword dictionary. It tests the raw string against verified Tamil and English stem patterns, tagging the update with fallbackMode: true and preserving the raw note identically.'),
          p('3. Verified Fallback Path: All 13 automated tests in ai.test.ts validate the deterministic Tamil and English keyword dictionary pattern matcher, passing at a 100% success rate without requiring external network connectivity.'),

          // ---------------------------------------------------------------------
          // 15. OFFLINE-FIRST QUEUE ARCHITECTURE
          // ---------------------------------------------------------------------
          h1('15.0 Offline-First IndexedDB Queue & Idempotent Sync Architecture'),
          p('In high-density textile manufacturing units, supervisors frequently enter basements, cutting rooms, or reinforced sheds where Wi-Fi and mobile connectivity drops. KnitTrack provides an offline-first data synchronization engine:'),
          bullet('Client-Side Storage Engine', 'Implemented in frontend/src/services/offlineQueue.service.ts, the queue utilizes the native browser IndexedDB API (object store: production_updates_queue) with an automated localStorage fallback for restricted browsing environments.'),
          bullet('UUIDv4 Idempotency Key', 'Whenever an update is queued on the client, a cryptographic UUIDv4 clientRequestId is generated. This key remains bound to the update across all retry attempts and network reconnection cycles.'),
          bullet('PostgreSQL Deduplication Constraint', 'The database schema enforces a UNIQUE(clientRequestId) index on the ProductionUpdate table. If an update is transmitted twice due to an interrupted TCP handshake, the server detects the duplicate clientRequestId and returns the existing record immediately without double-incrementing completed stage pieces.'),
          bullet('Automated FIFO Reconnection Flush', 'The client registers an event listener on window.addEventListener("online"). As soon as connectivity is restored, the queue flushes pending items sequentially in First-In-First-Out (FIFO) chronological order.'),
          bullet('Session Expiration Safety', 'If synchronization fails with HTTP 401 or 403 (e.g. JWT session expired during a long shift), the item is flagged as auth_required and retained in the queue. The supervisor can re-authenticate without losing uncommitted floor counts.'),

          // ---------------------------------------------------------------------
          // 16. BUYER WARNING APPROVAL WORKFLOW
          // ---------------------------------------------------------------------
          h1('16.0 Merchandiser Buyer Warning Approval & Floor Advisory Security Workflow'),
          p('In export garment manufacturing, broadcasting unverified floor delays directly to overseas retail buyers can damage commercial confidence and trigger unwarranted penalties. KnitTrack implements a multi-tier advisory approval workflow:'),
          bullet('Schema Enforcement', 'The ProductionUpdate table includes buyerWarningApproved (Boolean, default false), buyerWarningApprovedBy (String), and buyerWarningApprovedAt (DateTime).'),
          bullet('Server-Side Visibility Filter', 'In backend/src/services/buyer.service.ts, queries serving the Buyer Portal explicitly filter updates with where: { buyerWarningApproved: true }. Unapproved floor warnings (e.g. raw notes with delayRisk: true or critical categories like Machine breakdown or Material shortage) are completely hidden from the buyer payload.'),
          bullet('Merchandiser Review & Toggle', 'Merchandisers and Administrators review floor updates on the Order Detail view. A dedicated action button allows the merchandiser to approve or revoke buyer visibility, toggling buyerWarningApproved via PUT /api/production/updates/:id/approve-warning.'),
          bullet('Immutable Audit Logging', 'Every approval or revocation action writes an entry to the AuditLog table containing the update ID, user ID, action name, and timestamp.'),
          bullet('Curated Buyer Advisory Presentation', 'On the Buyer Portal (frontend/src/pages/BuyerPortalPage.tsx), approved alerts appear under a distinct "Merchandiser-Approved Floor Advisories" card, displaying verified delay reasons, impact explanations, and recovery plans.'),

          // ---------------------------------------------------------------------
          // 17. TESTING & VERIFICATION
          // ---------------------------------------------------------------------
          h1('17.0 Testing Strategy, Quality Assurance & Verification'),
          p('The KnitTrack test suite emphasizes automated verification of business logic, mathematical precision, server-side security, offline resilience, and buyer tenant isolation:'),
          createStyledTable(
            ['Test Suite File', 'Test Harness', 'Category / Verified Capabilities', 'Tests Passed', 'Pass Rate'],
            [
              ['delay.test.ts', 'Vitest 3.2', '5-day business week math, actual/required run rate, zero output, past deadline, risk boundary transitions', '24 passed', '100%'],
              ['ai.test.ts', 'Vitest 3.2', 'Tamil colloquial phrases, English text, regex fallback dictionary, whitespace resilience, audit logging', '13 passed', '100%'],
              ['orders.test.ts', 'Supertest 7.1', 'Purchase order CRUD, duplicate PO rejection, size ratio JSON validation, supervisor unit scoping', '20 passed', '100%'],
              ['auth.test.ts', 'Supertest 7.1', 'Credential validation, bcrypt check, HttpOnly cookie issuance, token decoding, logout cookie clearing', '12 passed', '100%'],
              ['rbac_isolation.test.ts', 'Supertest 7.1', 'Cross-role 403 enforcement, Buyer B vs Buyer C isolation, timeline scoping, supervisor floor limits', '13 passed', '100%'],
              ['buyer_approval.test.ts', 'Supertest 7.1', 'Merchandiser warning approval, revocation, server-side filtering, buyer modification rejection, idempotency', '7 passed', '100%'],
              ['StatusBadge.test.tsx', 'Vitest 3.2', 'Frontend semantic badge rendering, risk color classes, accessible screen-reader labels', '4 passed', '100%'],
              ['offlineQueue.test.ts', 'Vitest 3.2', 'IndexedDB queueing, persistence, auto-sync on online, FIFO order, network retry, clientRequestId idempotency, auth safety', '9 passed', '100%'],
              ['GRAND TOTAL', 'Vitest / Supertest', 'Complete End-to-End Automated Test Suite Across Full Stack (89 Backend + 13 Frontend)', '102 passed', '100%'],
            ],
            [22, 14, 46, 10, 8]
          ),

          new Paragraph({ text: '', spacing: { after: 140 } }),

          h2('17.1 Production Build & Database Verification'),
          bullet('Backend TypeScript Compilation', 'Executed `npm --prefix backend run build` (tsc). Result: 0 errors, 0 warnings. Clean JavaScript output generated in backend/dist/.'),
          bullet('Frontend Production Bundle', 'Executed `npm --prefix frontend run build` (tsc -b && vite build). Result: 0 errors. Clean client bundle generated in frontend/dist/ in 2.24s.'),
          bullet('Database Read-Only Verification', 'Executed `npx --prefix backend tsx backend/scripts/verify-orders.ts`. Verified 7 seeded orders and 8 user accounts intact in PostgreSQL 17 database.'),
          bullet('Note on Completed Order C-PO-0512', 'While C-PO-0512 carries an ex-factory date of 2026-10-25 (prior to the current reference date), the order status is COMPLETED and all 5,000 planned units across Cutting, Stitching, Finishing, and Packing were 100% completed on or before 2026-10-06. Because remaining quantity is 0 and all stages are marked COMPLETED, the calculation engine (analyseStage) sets remainingQuantity = 0 and projectedDelayDays = 0, correctly classifying the completed order as ON_TRACK.'),

          // ---------------------------------------------------------------------
          // 18. DEPLOYMENT & DEVOPS RUNBOOK
          // ---------------------------------------------------------------------
          h1('18.0 Deployment Architecture & Operational Runbook Summary'),
          p('For step-by-step local setup, environment configurations, and troubleshooting, refer directly to deployment.md. The table below summarizes the environment architectures:'),
          createStyledTable(
            ['Environment Tier', 'Frontend Hosting', 'Backend Service', 'Database Engine', 'Object Storage'],
            [
              ['Local Assessment Dev (Current)', 'Vite Dev Server (localhost:5173)', 'Node.js Express (localhost:3001)', 'PostgreSQL 17 (localhost:5432) via Prisma ORM', 'Local Disk Storage (backend/uploads/ via Multer)'],
              ['Cloud Staging (Vercel/Render)', 'Vercel Edge Network (Global CDN)', 'Render Web Service (Containerized Node.js)', 'Neon.tech / Supabase Managed Cloud PostgreSQL', 'AWS S3 Bucket or Cloudflare R2 with Presigned URLs'],
              ['High-Volume Enterprise Prod', 'Vercel / Cloudflare Pages', 'AWS ECS Fargate (Auto-scaling cluster)', 'AWS RDS PostgreSQL (Multi-AZ, Read Replicas)', 'AWS S3 + CloudFront CDN + Redis Session Cache'],
            ],
            [20, 20, 20, 20, 20]
          ),

          // ---------------------------------------------------------------------
          // 19. LIMITATIONS & TRADE-OFFS
          // ---------------------------------------------------------------------
          h1('19.0 Engineering Limitations & Architectural Trade-Offs'),
          p('To maintain technical credibility, the following constraints reflect deliberate architectural trade-offs made during development:'),
          bullet('1. Closed-Browser Background Sync', 'While offline queueing and automatic sync on reconnection are fully implemented via IndexedDB, syncing while the browser tab is entirely closed requires the ServiceWorker Background Sync API, which remains experimental across iOS WebKit.'),
          bullet('2. Local Disk vs Cloud Object Storage', 'Uploaded stage assembly photos are stored on local filesystem volumes via Multer in development. Production deployment requires migrating to S3-compatible cloud storage with presigned URLs to support stateless container instances.'),
          bullet('3. In-Memory Rate Limiting', 'Express rate limiting currently stores request counts in process memory. In a distributed multi-instance deployment, rate limiting must be backed by a centralized Redis instance.'),
          bullet('4. Schema Migration Safety Notice', 'Prisma db push applies schema changes directly. While non-destructive updates are preserved, destructive changes (e.g. dropping columns or altering constraints) can result in data loss. Production workflows must use formal migrations and database backups.'),

          // ---------------------------------------------------------------------
          // 20. POST-MVP ROADMAP
          // ---------------------------------------------------------------------
          h1('20.0 Post-MVP Engineering Roadmap'),
          bullet('V2 Milestone 1: ServiceWorker Background Sync', 'Implement Workbox ServiceWorker background sync for background sync even when the browser tab is dismissed.'),
          bullet('V2 Milestone 2: IoT Sewing Sensor Integration', 'Integrate MQTT industrial telemetry sensors on sewing machine motors to track stitch counts and machine uptime automatically.'),
          bullet('V2 Milestone 3: Automated PDF Inspection Certificates', 'Provide merchandisers with one-click generation of branded PDF Time-and-Action Gantt charts and pre-shipment inspection certificates for international buyers.'),
          bullet('V2 Milestone 4: WhatsApp Business Shift Reminders', 'Automate end-of-shift WhatsApp notifications prompting line supervisors to submit daily outputs directly from messaging channels.'),

          // ---------------------------------------------------------------------
          // 21. CONCLUSION
          // ---------------------------------------------------------------------
          h1('21.0 Architectural Conclusion & Evaluation Baseline'),
          p('KnitTrack replaces manual, error-prone knitwear tracking practices with an auditable digital operations platform. By combining a mathematically transparent 5-day business week delay engine, an AI-assisted Tamil/English note classifier with robust regex fallback, offline-first IndexedDB queueing with clientRequestId deduplication, server-side RBAC, and curated buyer advisory workflows, the system provides operational visibility across manufacturing stages.'),
          p('With 102 automated tests passing at a 100% success rate, clean TypeScript compilation across both frontend and backend, and verified data integrity in PostgreSQL 17, KnitTrack represents a stable, thoroughly tested candidate submission for the Isocode Labs software engineering internship assessment.'),

          // ---------------------------------------------------------------------
          // 22. REFERENCES
          // ---------------------------------------------------------------------
          h1('22.0 References & Verification Artifacts'),
          bullet('GitHub Project Repository', 'https://github.com/ayanali0249/knittrack-production-tracker'),
          bullet('Deployment Runbook', 'deployment.md (included in root repository and submission ZIP)'),
          bullet('Prisma Database Schema', 'backend/prisma/schema.prisma'),
          bullet('Automated Test Suites', 'backend/src/__tests__/ (delay, ai, orders, auth, rbac_isolation, buyer_approval) and frontend/src/__tests__/ (StatusBadge, offlineQueue)'),
          bullet('Database Verification Script', 'backend/scripts/verify-orders.ts (safe read-only query harness)'),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(rootDir, 'KnitTrack_Technical_Design_Document.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Successfully generated KnitTrack Technical Design Document at:\n  ${outputPath}`);
  console.log(`  File Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

buildDocument().catch((err) => {
  console.error('Fatal error generating TDD:', err);
  process.exit(1);
});
