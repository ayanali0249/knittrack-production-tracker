/**
 * KnitTrack Seed Data
 *
 * Creates:
 * - Production Units (3)
 * - Buyers (3 including Company B and Company C)
 * - Users (6 demo accounts + extras)
 * - Production Orders (5+ including 3 required assessment orders)
 * - Order Stages with realistic dates
 * - Production Updates with daily records and notes
 */

import { PrismaClient, UserRole, OrderStatus, StageStatus, RiskLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding KnitTrack database...\n');

  // Clean existing data (order matters for FK constraints)
  await prisma.auditLog.deleteMany();
  await prisma.buyerAccessToken.deleteMany();
  await prisma.productionPhoto.deleteMany();
  await prisma.productionUpdate.deleteMany();
  await prisma.orderStage.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.user.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.productionUnit.deleteMany();

  console.log('  ✓ Cleared existing data');

  // ── Production Units (Tiruppur, Tamil Nadu) ──
  const unit1 = await prisma.productionUnit.create({
    data: {
      name: 'Unit 1 - Angeripalayam Main Unit',
      location: 'Angeripalayam, Tiruppur, Tamil Nadu',
      capacity: 50000,
    },
  });

  const unit2 = await prisma.productionUnit.create({
    data: {
      name: 'Unit 2 - Kangeyam Road Unit',
      location: 'Kangeyam Road, Tiruppur, Tamil Nadu',
      capacity: 35000,
    },
  });

  const unit3 = await prisma.productionUnit.create({
    data: {
      name: 'Unit 3 - Palladam Hi-Tech Unit',
      location: 'Palladam, Tiruppur, Tamil Nadu',
      capacity: 25000,
    },
  });

  console.log('  ✓ Created 3 production units');

  // ── Buyers ──────────────────────────────────────
  const buyerA = await prisma.buyer.create({
    data: {
      name: 'Company A',
      country: 'USA',
      contactEmail: 'orders@company-a.com',
      contactPerson: 'John Smith',
    },
  });

  const buyerB = await prisma.buyer.create({
    data: {
      name: 'Company B',
      country: 'UK',
      contactEmail: 'procurement@company-b.co.uk',
      contactPerson: 'Sarah Johnson',
    },
  });

  const buyerC = await prisma.buyer.create({
    data: {
      name: 'Company C',
      country: 'Germany',
      contactEmail: 'einkauf@company-c.de',
      contactPerson: 'Hans Mueller',
    },
  });

  console.log('  ✓ Created 3 buyers');

  // ── Users ───────────────────────────────────────
  const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@knittrack.com',
      name: 'Admin User',
      password: hashPassword('admin123'),
      role: UserRole.ADMIN,
    },
  });

  const merch = await prisma.user.create({
    data: {
      email: 'merch@knittrack.com',
      name: 'Priya Sundaram',
      password: hashPassword('merch123'),
      role: UserRole.MERCHANDISER,
    },
  });

  const supervisor1 = await prisma.user.create({
    data: {
      email: 'supervisor1@knittrack.com',
      name: 'K. Murugan',
      password: hashPassword('super123'),
      role: UserRole.SUPERVISOR,
      productionUnitId: unit1.id,
    },
  });

  const supervisor2 = await prisma.user.create({
    data: {
      email: 'supervisor2@knittrack.com',
      name: 'S. Selvaraj',
      password: hashPassword('super123'),
      role: UserRole.SUPERVISOR,
      productionUnitId: unit2.id,
    },
  });

  const buyerUserB = await prisma.user.create({
    data: {
      email: 'buyer.b@knittrack.com',
      name: 'Sarah Johnson (Company B UK)',
      password: hashPassword('buyer123'),
      role: UserRole.BUYER,
      buyerId: buyerB.id,
    },
  });

  const buyerUserC = await prisma.user.create({
    data: {
      email: 'buyer.c@knittrack.com',
      name: 'Hans Mueller (Company C Germany)',
      password: hashPassword('buyer123'),
      role: UserRole.BUYER,
      buyerId: buyerC.id,
    },
  });

  // Extra supervisor for unit 3
  const supervisor3 = await prisma.user.create({
    data: {
      email: 'supervisor3@knittrack.com',
      name: 'R. Kumar',
      password: hashPassword('super123'),
      role: UserRole.SUPERVISOR,
      productionUnitId: unit3.id,
    },
  });

  // Extra merchandiser
  const merch2 = await prisma.user.create({
    data: {
      email: 'merch2@knittrack.com',
      name: 'Dilani Gunaratne',
      password: hashPassword('merch123'),
      role: UserRole.MERCHANDISER,
    },
  });

  console.log('  ✓ Created 8 users');

  // ── Helper: date generators ─────────────────────
  const d = (dateStr: string) => new Date(dateStr);

  // ── ORDER 1: B-PO-88213 ────────────────────────
  // Buyer "Company B" (UK), Style "Men's crew neck tee, navy"
  // Qty 12000, Ex-factory 2026-11-20, Stitching at 6800 completed
  const order1 = await prisma.productionOrder.create({
    data: {
      poNumber: 'B-PO-88213',
      buyerId: buyerB.id,
      styleName: "Men's crew neck tee, navy",
      description: 'Classic crew neck t-shirt in navy blue, 100% cotton jersey, 180 GSM',
      colour: 'Navy',
      sizes: { S: 2000, M: 3500, L: 4000, XL: 2500 },
      totalQuantity: 12000,
      productionUnitId: unit1.id,
      exFactoryDate: d('2026-11-20'),
      status: OrderStatus.ACTIVE,
      riskLevel: RiskLevel.ON_TRACK,
      createdById: merch.id,
    },
  });

  // Stages for Order 1
  const order1Stages = await Promise.all([
    prisma.orderStage.create({
      data: {
        orderId: order1.id, stageName: 'Cutting', sequence: 1,
        plannedStartDate: d('2026-10-01'), plannedEndDate: d('2026-10-08'),
        plannedQuantity: 12000, completedQuantity: 12000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-10-01'), actualEndDate: d('2026-10-07'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order1.id, stageName: 'Printing', sequence: 2,
        plannedStartDate: d('2026-10-08'), plannedEndDate: d('2026-10-15'),
        plannedQuantity: 12000, completedQuantity: 12000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-10-08'), actualEndDate: d('2026-10-14'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order1.id, stageName: 'Stitching', sequence: 3,
        plannedStartDate: d('2026-10-15'), plannedEndDate: d('2026-10-30'),
        plannedQuantity: 12000, completedQuantity: 6800,
        status: StageStatus.IN_PROGRESS,
        actualStartDate: d('2026-10-15'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order1.id, stageName: 'Washing', sequence: 4,
        plannedStartDate: d('2026-10-30'), plannedEndDate: d('2026-11-05'),
        plannedQuantity: 12000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order1.id, stageName: 'Finishing', sequence: 5,
        plannedStartDate: d('2026-11-05'), plannedEndDate: d('2026-11-13'),
        plannedQuantity: 12000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order1.id, stageName: 'Packing', sequence: 6,
        plannedStartDate: d('2026-11-13'), plannedEndDate: d('2026-11-19'),
        plannedQuantity: 12000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
  ]);

  // Production updates for Order 1 - Stitching stage
  const stitchingStage1 = order1Stages[2];
  const stitchingUpdates1 = [
    { date: '2026-10-15', qty: 450, note: 'Started stitching, initial setup took time' },
    { date: '2026-10-16', qty: 520, note: null },
    { date: '2026-10-17', qty: 480, note: 'Minor machine adjustment needed' },
    { date: '2026-10-20', qty: 550, note: null },
    { date: '2026-10-21', qty: 530, note: null },
    { date: '2026-10-22', qty: 510, note: 'இயந்திரம் பழுது - 1 hour downtime' }, // Tamil: machine breakdown
    { date: '2026-10-23', qty: 540, note: null },
    { date: '2026-10-24', qty: 560, note: null },
    { date: '2026-10-27', qty: 520, note: null },
    { date: '2026-10-28', qty: 490, note: 'Quality check: minor rework on collars' },
    { date: '2026-10-29', qty: 500, note: null },
    { date: '2026-10-30', qty: 530, note: null },
    { date: '2026-10-31', qty: 120, note: 'Half day - staff training' },
  ];

  for (const u of stitchingUpdates1) {
    await prisma.productionUpdate.create({
      data: {
        orderStageId: stitchingStage1.id,
        supervisorId: supervisor1.id,
        date: d(u.date),
        quantity: u.qty,
        note: u.note,
        originalNote: u.note,
      },
    });
  }

  // Updates for completed cutting stage
  const cuttingStage1 = order1Stages[0];
  const cuttingUpdates1 = [
    { date: '2026-10-01', qty: 2000, note: 'Started cutting, fabric quality good' },
    { date: '2026-10-02', qty: 2200, note: null },
    { date: '2026-10-03', qty: 1800, note: null },
    { date: '2026-10-06', qty: 2100, note: null },
    { date: '2026-10-07', qty: 3900, note: 'Extra team deployed, cutting completed ahead of schedule' },
  ];

  for (const u of cuttingUpdates1) {
    await prisma.productionUpdate.create({
      data: {
        orderStageId: cuttingStage1.id,
        supervisorId: supervisor1.id,
        date: d(u.date),
        quantity: u.qty,
        note: u.note,
        originalNote: u.note,
      },
    });
  }

  console.log('  ✓ Created Order 1: B-PO-88213 with stages and updates');

  // ── ORDER 2: B-PO-88240 ────────────────────────
  // Buyer "Company B" (UK), Style "Men's polo, white"
  // Qty 8000, Ex-factory 2026-11-12, Finishing at 5200 completed
  const order2 = await prisma.productionOrder.create({
    data: {
      poNumber: 'B-PO-88240',
      buyerId: buyerB.id,
      styleName: "Men's polo, white",
      description: 'Classic polo shirt in white, pique knit, 200 GSM',
      colour: 'White',
      sizes: { S: 1500, M: 2500, L: 2500, XL: 1500 },
      totalQuantity: 8000,
      productionUnitId: unit1.id,
      exFactoryDate: d('2026-11-12'),
      status: OrderStatus.ACTIVE,
      riskLevel: RiskLevel.AT_RISK,
      createdById: merch.id,
    },
  });

  const order2Stages = await Promise.all([
    prisma.orderStage.create({
      data: {
        orderId: order2.id, stageName: 'Cutting', sequence: 1,
        plannedStartDate: d('2026-09-20'), plannedEndDate: d('2026-09-26'),
        plannedQuantity: 8000, completedQuantity: 8000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-09-20'), actualEndDate: d('2026-09-25'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order2.id, stageName: 'Stitching', sequence: 2,
        plannedStartDate: d('2026-09-26'), plannedEndDate: d('2026-10-10'),
        plannedQuantity: 8000, completedQuantity: 8000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-09-26'), actualEndDate: d('2026-10-09'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order2.id, stageName: 'Washing', sequence: 3,
        plannedStartDate: d('2026-10-10'), plannedEndDate: d('2026-10-16'),
        plannedQuantity: 8000, completedQuantity: 8000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-10-10'), actualEndDate: d('2026-10-16'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order2.id, stageName: 'Finishing', sequence: 4,
        plannedStartDate: d('2026-10-16'), plannedEndDate: d('2026-10-28'),
        plannedQuantity: 8000, completedQuantity: 5200,
        status: StageStatus.IN_PROGRESS,
        actualStartDate: d('2026-10-17'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order2.id, stageName: 'Packing', sequence: 5,
        plannedStartDate: d('2026-10-28'), plannedEndDate: d('2026-11-11'),
        plannedQuantity: 8000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
  ]);

  // Production updates for Order 2 - Finishing stage
  const finishingStage2 = order2Stages[3];
  const finishingUpdates2 = [
    { date: '2026-10-17', qty: 400, note: 'Started finishing process' },
    { date: '2026-10-20', qty: 450, note: null },
    { date: '2026-10-21', qty: 420, note: 'தொழிலாளர் பற்றாக்குறை - 3 absent' }, // Tamil: labour shortage
    { date: '2026-10-22', qty: 480, note: null },
    { date: '2026-10-23', qty: 500, note: null },
    { date: '2026-10-24', qty: 460, note: null },
    { date: '2026-10-27', qty: 510, note: null },
    { date: '2026-10-28', qty: 490, note: null },
    { date: '2026-10-29', qty: 520, note: 'Good progress today' },
    { date: '2026-10-30', qty: 470, note: 'Quality issue on button alignment, rework needed' },
    { date: '2026-10-31', qty: 500, note: null },
  ];

  for (const u of finishingUpdates2) {
    await prisma.productionUpdate.create({
      data: {
        orderStageId: finishingStage2.id,
        supervisorId: supervisor1.id,
        date: d(u.date),
        quantity: u.qty,
        note: u.note,
        originalNote: u.note,
      },
    });
  }

  console.log('  ✓ Created Order 2: B-PO-88240 with stages and updates');

  // ── ORDER 3: C-PO-0488 ─────────────────────────
  // Buyer "Company C" (Germany), Style "Kids printed tee, yellow"
  // Qty 10000, Ex-factory 2026-11-28, Printing at 3100 completed
  const order3 = await prisma.productionOrder.create({
    data: {
      poNumber: 'C-PO-0488',
      buyerId: buyerC.id,
      styleName: 'Kids printed tee, yellow',
      description: 'Kids t-shirt with screen print, yellow, 160 GSM cotton',
      colour: 'Yellow',
      sizes: { '2-3Y': 1500, '4-5Y': 2500, '6-7Y': 3000, '8-9Y': 2000, '10-11Y': 1000 },
      totalQuantity: 10000,
      productionUnitId: unit2.id,
      exFactoryDate: d('2026-11-28'),
      status: OrderStatus.ACTIVE,
      riskLevel: RiskLevel.ON_TRACK,
      createdById: merch.id,
    },
  });

  const order3Stages = await Promise.all([
    prisma.orderStage.create({
      data: {
        orderId: order3.id, stageName: 'Cutting', sequence: 1,
        plannedStartDate: d('2026-10-05'), plannedEndDate: d('2026-10-12'),
        plannedQuantity: 10000, completedQuantity: 10000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-10-05'), actualEndDate: d('2026-10-11'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order3.id, stageName: 'Printing', sequence: 2,
        plannedStartDate: d('2026-10-12'), plannedEndDate: d('2026-10-26'),
        plannedQuantity: 10000, completedQuantity: 3100,
        status: StageStatus.IN_PROGRESS,
        actualStartDate: d('2026-10-13'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order3.id, stageName: 'Stitching', sequence: 3,
        plannedStartDate: d('2026-10-26'), plannedEndDate: d('2026-11-09'),
        plannedQuantity: 10000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order3.id, stageName: 'Washing', sequence: 4,
        plannedStartDate: d('2026-11-09'), plannedEndDate: d('2026-11-14'),
        plannedQuantity: 10000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order3.id, stageName: 'Finishing', sequence: 5,
        plannedStartDate: d('2026-11-14'), plannedEndDate: d('2026-11-21'),
        plannedQuantity: 10000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order3.id, stageName: 'Packing', sequence: 6,
        plannedStartDate: d('2026-11-21'), plannedEndDate: d('2026-11-27'),
        plannedQuantity: 10000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
  ]);

  // Production updates for Order 3 - Printing stage
  const printingStage3 = order3Stages[1];
  const printingUpdates3 = [
    { date: '2026-10-13', qty: 300, note: 'Print screen setup, first batch run' },
    { date: '2026-10-14', qty: 350, note: null },
    { date: '2026-10-15', qty: 380, note: 'மின் தடை - power outage 2 hours' }, // Tamil: power outage
    { date: '2026-10-16', qty: 400, note: null },
    { date: '2026-10-17', qty: 370, note: null },
    { date: '2026-10-20', qty: 420, note: 'New ink batch, colour matching checked' },
    { date: '2026-10-21', qty: 430, note: null },
    { date: '2026-10-22', qty: 450, note: null },
  ];

  for (const u of printingUpdates3) {
    await prisma.productionUpdate.create({
      data: {
        orderStageId: printingStage3.id,
        supervisorId: supervisor2.id,
        date: d(u.date),
        quantity: u.qty,
        note: u.note,
        originalNote: u.note,
      },
    });
  }

  console.log('  ✓ Created Order 3: C-PO-0488 with stages and updates');

  // ── ORDER 4: A-PO-5510 (additional — delayed scenario) ────
  const order4 = await prisma.productionOrder.create({
    data: {
      poNumber: 'A-PO-5510',
      buyerId: buyerA.id,
      styleName: "Women's hoodie, charcoal",
      description: 'Pullover hoodie, charcoal grey, 320 GSM fleece, kangaroo pocket',
      colour: 'Charcoal',
      sizes: { S: 1500, M: 2500, L: 2000, XL: 1000 },
      totalQuantity: 7000,
      productionUnitId: unit1.id,
      exFactoryDate: d('2026-11-08'),
      status: OrderStatus.ACTIVE,
      riskLevel: RiskLevel.DELAYED,
      createdById: merch2.id,
    },
  });

  const order4Stages = await Promise.all([
    prisma.orderStage.create({
      data: {
        orderId: order4.id, stageName: 'Cutting', sequence: 1,
        plannedStartDate: d('2026-09-15'), plannedEndDate: d('2026-09-22'),
        plannedQuantity: 7000, completedQuantity: 7000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-09-15'), actualEndDate: d('2026-09-22'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order4.id, stageName: 'Stitching', sequence: 2,
        plannedStartDate: d('2026-09-22'), plannedEndDate: d('2026-10-08'),
        plannedQuantity: 7000, completedQuantity: 7000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-09-23'), actualEndDate: d('2026-10-10'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order4.id, stageName: 'Washing', sequence: 3,
        plannedStartDate: d('2026-10-08'), plannedEndDate: d('2026-10-14'),
        plannedQuantity: 7000, completedQuantity: 7000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-10-10'), actualEndDate: d('2026-10-16'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order4.id, stageName: 'Finishing', sequence: 4,
        plannedStartDate: d('2026-10-14'), plannedEndDate: d('2026-10-22'),
        plannedQuantity: 7000, completedQuantity: 4200,
        status: StageStatus.DELAYED,
        actualStartDate: d('2026-10-17'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order4.id, stageName: 'Packing', sequence: 5,
        plannedStartDate: d('2026-10-22'), plannedEndDate: d('2026-11-07'),
        plannedQuantity: 7000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
  ]);

  // Production updates for Order 4 - Finishing stage (slow production)
  const finishingStage4 = order4Stages[3];
  const finishingUpdates4 = [
    { date: '2026-10-17', qty: 300, note: 'Started late due to washing delay' },
    { date: '2026-10-20', qty: 350, note: 'பொருள் பற்றாக்குறை - zipper supply delayed' }, // Tamil: material shortage
    { date: '2026-10-21', qty: 400, note: null },
    { date: '2026-10-22', qty: 380, note: 'Material shortage for drawstrings' },
    { date: '2026-10-23', qty: 420, note: null },
    { date: '2026-10-24', qty: 350, note: 'Quality hold - seam inspection' },
    { date: '2026-10-27', qty: 400, note: null },
    { date: '2026-10-28', qty: 380, note: null },
    { date: '2026-10-29', qty: 420, note: null },
    { date: '2026-10-30', qty: 400, note: 'Supplier delay on grommets' },
    { date: '2026-10-31', qty: 400, note: null },
  ];

  for (const u of finishingUpdates4) {
    await prisma.productionUpdate.create({
      data: {
        orderStageId: finishingStage4.id,
        supervisorId: supervisor1.id,
        date: d(u.date),
        quantity: u.qty,
        note: u.note,
        originalNote: u.note,
      },
    });
  }

  console.log('  ✓ Created Order 4: A-PO-5510 (delayed scenario)');

  // ── ORDER 5: C-PO-0512 (additional — completed order) ─────
  const order5 = await prisma.productionOrder.create({
    data: {
      poNumber: 'C-PO-0512',
      buyerId: buyerC.id,
      styleName: "Women's tank top, coral",
      description: 'Lightweight tank top, coral, 140 GSM single jersey',
      colour: 'Coral',
      sizes: { S: 1000, M: 1500, L: 1500, XL: 1000 },
      totalQuantity: 5000,
      productionUnitId: unit3.id,
      exFactoryDate: d('2026-10-25'),
      status: OrderStatus.COMPLETED,
      riskLevel: RiskLevel.ON_TRACK,
      createdById: merch.id,
    },
  });

  await Promise.all([
    prisma.orderStage.create({
      data: {
        orderId: order5.id, stageName: 'Cutting', sequence: 1,
        plannedStartDate: d('2026-09-08'), plannedEndDate: d('2026-09-12'),
        plannedQuantity: 5000, completedQuantity: 5000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-09-08'), actualEndDate: d('2026-09-11'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order5.id, stageName: 'Stitching', sequence: 2,
        plannedStartDate: d('2026-09-12'), plannedEndDate: d('2026-09-22'),
        plannedQuantity: 5000, completedQuantity: 5000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-09-12'), actualEndDate: d('2026-09-20'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order5.id, stageName: 'Finishing', sequence: 3,
        plannedStartDate: d('2026-09-22'), plannedEndDate: d('2026-10-01'),
        plannedQuantity: 5000, completedQuantity: 5000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-09-22'), actualEndDate: d('2026-09-30'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order5.id, stageName: 'Packing', sequence: 4,
        plannedStartDate: d('2026-10-01'), plannedEndDate: d('2026-10-07'),
        plannedQuantity: 5000, completedQuantity: 5000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-10-01'), actualEndDate: d('2026-10-06'),
      },
    }),
  ]);

  console.log('  ✓ Created Order 5: C-PO-0512 (completed)');

  // ── ORDER 6: A-PO-5525 (additional — on track, early stage) ────
  const order6 = await prisma.productionOrder.create({
    data: {
      poNumber: 'A-PO-5525',
      buyerId: buyerA.id,
      styleName: "Men's jogger pants, olive",
      description: 'Slim-fit jogger pants, olive green, 280 GSM French terry',
      colour: 'Olive',
      sizes: { S: 1000, M: 2000, L: 2500, XL: 1500 },
      totalQuantity: 7000,
      productionUnitId: unit2.id,
      exFactoryDate: d('2026-12-15'),
      status: OrderStatus.ACTIVE,
      riskLevel: RiskLevel.ON_TRACK,
      createdById: merch2.id,
    },
  });

  const order6Stages = await Promise.all([
    prisma.orderStage.create({
      data: {
        orderId: order6.id, stageName: 'Cutting', sequence: 1,
        plannedStartDate: d('2026-10-20'), plannedEndDate: d('2026-10-27'),
        plannedQuantity: 7000, completedQuantity: 7000,
        status: StageStatus.COMPLETED,
        actualStartDate: d('2026-10-20'), actualEndDate: d('2026-10-26'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order6.id, stageName: 'Stitching', sequence: 2,
        plannedStartDate: d('2026-10-27'), plannedEndDate: d('2026-11-12'),
        plannedQuantity: 7000, completedQuantity: 2400,
        status: StageStatus.IN_PROGRESS,
        actualStartDate: d('2026-10-27'),
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order6.id, stageName: 'Washing', sequence: 3,
        plannedStartDate: d('2026-11-12'), plannedEndDate: d('2026-11-18'),
        plannedQuantity: 7000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order6.id, stageName: 'Finishing', sequence: 4,
        plannedStartDate: d('2026-11-18'), plannedEndDate: d('2026-11-27'),
        plannedQuantity: 7000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order6.id, stageName: 'Packing', sequence: 5,
        plannedStartDate: d('2026-11-27'), plannedEndDate: d('2026-12-05'),
        plannedQuantity: 7000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
  ]);

  // Stitching updates for order 6
  const stitchingStage6 = order6Stages[1];
  const stitchingUpdates6 = [
    { date: '2026-10-27', qty: 450, note: 'Good start, strong team' },
    { date: '2026-10-28', qty: 480, note: null },
    { date: '2026-10-29', qty: 500, note: null },
    { date: '2026-10-30', qty: 490, note: null },
    { date: '2026-10-31', qty: 480, note: null },
  ];

  for (const u of stitchingUpdates6) {
    await prisma.productionUpdate.create({
      data: {
        orderStageId: stitchingStage6.id,
        supervisorId: supervisor2.id,
        date: d(u.date),
        quantity: u.qty,
        note: u.note,
        originalNote: u.note,
      },
    });
  }

  console.log('  ✓ Created Order 6: A-PO-5525 (on track)');

  // ── ORDER 7: B-PO-88260 (additional — draft order) ────
  const order7 = await prisma.productionOrder.create({
    data: {
      poNumber: 'B-PO-88260',
      buyerId: buyerB.id,
      styleName: "Men's V-neck tee, burgundy",
      description: 'V-neck t-shirt in burgundy, 180 GSM combed cotton',
      colour: 'Burgundy',
      sizes: { S: 1500, M: 2500, L: 3000, XL: 2000 },
      totalQuantity: 9000,
      productionUnitId: unit3.id,
      exFactoryDate: d('2026-12-20'),
      status: OrderStatus.DRAFT,
      riskLevel: RiskLevel.ON_TRACK,
      createdById: merch.id,
    },
  });

  await Promise.all([
    prisma.orderStage.create({
      data: {
        orderId: order7.id, stageName: 'Cutting', sequence: 1,
        plannedStartDate: d('2026-11-10'), plannedEndDate: d('2026-11-17'),
        plannedQuantity: 9000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order7.id, stageName: 'Printing', sequence: 2,
        plannedStartDate: d('2026-11-17'), plannedEndDate: d('2026-11-24'),
        plannedQuantity: 9000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order7.id, stageName: 'Stitching', sequence: 3,
        plannedStartDate: d('2026-11-24'), plannedEndDate: d('2026-12-05'),
        plannedQuantity: 9000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order7.id, stageName: 'Finishing', sequence: 4,
        plannedStartDate: d('2026-12-05'), plannedEndDate: d('2026-12-12'),
        plannedQuantity: 9000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
    prisma.orderStage.create({
      data: {
        orderId: order7.id, stageName: 'Packing', sequence: 5,
        plannedStartDate: d('2026-12-12'), plannedEndDate: d('2026-12-19'),
        plannedQuantity: 9000, completedQuantity: 0,
        status: StageStatus.NOT_STARTED,
      },
    }),
  ]);

  console.log('  ✓ Created Order 7: B-PO-88260 (draft)');

  // ── Buyer Access Tokens ─────────────────────────
  await prisma.buyerAccessToken.create({
    data: {
      buyerId: buyerB.id,
      token: 'demo-buyer-b-token-2026',
      expiresAt: new Date('2027-06-01'),
    },
  });

  await prisma.buyerAccessToken.create({
    data: {
      buyerId: buyerC.id,
      token: 'demo-buyer-c-token-2026',
      expiresAt: new Date('2027-06-01'),
    },
  });

  console.log('  ✓ Created buyer access tokens');

  // ── Summary ─────────────────────────────────────
  console.log('\n🎉 Seed completed successfully!\n');
  console.log('  Demo Accounts:');
  console.log('  ┌─────────────────────────────────┬──────────┬──────────────┐');
  console.log('  │ Email                           │ Password │ Role         │');
  console.log('  ├─────────────────────────────────┼──────────┼──────────────┤');
  console.log('  │ admin@knittrack.com             │ admin123 │ ADMIN        │');
  console.log('  │ merch@knittrack.com             │ merch123 │ MERCHANDISER │');
  console.log('  │ supervisor1@knittrack.com       │ super123 │ SUPERVISOR   │');
  console.log('  │ supervisor2@knittrack.com       │ super123 │ SUPERVISOR   │');
  console.log('  │ buyer.b@knittrack.com           │ buyer123 │ BUYER        │');
  console.log('  │ buyer.c@knittrack.com           │ buyer123 │ BUYER        │');
  console.log('  └─────────────────────────────────┴──────────┴──────────────┘');
  console.log('\n  Orders:');
  console.log('  • B-PO-88213 — Men\'s crew neck tee, navy (12000 pcs, Stitching in progress)');
  console.log('  • B-PO-88240 — Men\'s polo, white (8000 pcs, Finishing in progress)');
  console.log('  • C-PO-0488  — Kids printed tee, yellow (10000 pcs, Printing in progress)');
  console.log('  • A-PO-5510  — Women\'s hoodie, charcoal (7000 pcs, DELAYED)');
  console.log('  • C-PO-0512  — Women\'s tank top, coral (5000 pcs, COMPLETED)');
  console.log('  • A-PO-5525  — Men\'s jogger pants, olive (7000 pcs, ON TRACK)');
  console.log('  • B-PO-88260 — Men\'s V-neck tee, burgundy (9000 pcs, DRAFT)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
