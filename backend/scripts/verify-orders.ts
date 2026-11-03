import prisma from '../src/lib/prisma';

async function checkOrders() {
  console.log('Querying seeded orders from PostgreSQL via Prisma Client...');
  const orders = await prisma.productionOrder.findMany({
    orderBy: { poNumber: 'asc' },
    select: {
      poNumber: true,
      styleName: true,
      colour: true,
      totalQuantity: true,
      exFactoryDate: true,
      status: true,
      riskLevel: true,
      buyer: { select: { name: true, country: true } },
      productionUnit: { select: { name: true } },
    },
  });

  console.log(`\nTotal Seeded Orders Found: ${orders.length}\n`);
  for (const o of orders) {
    const exDate = o.exFactoryDate.toISOString().split('T')[0];
    console.log(`[${o.poNumber}] ${o.styleName} (${o.colour})`);
    console.log(`   Buyer: ${o.buyer.name} (${o.buyer.country}) | Unit: ${o.productionUnit.name.split('-')[0].trim()}`);
    console.log(`   Total Quantity: ${o.totalQuantity.toLocaleString()} pcs | Ex-Factory: ${exDate} | Risk: ${o.riskLevel}\n`);
  }

  console.log('--- Assessment Sample Orders Stage Verification ---');
  const sampleOrders = await prisma.productionOrder.findMany({
    where: { poNumber: { in: ['B-PO-88213', 'B-PO-88240', 'C-PO-0488'] } },
    include: {
      stages: {
        orderBy: { sequence: 'asc' },
        select: {
          stageName: true,
          sequence: true,
          status: true,
          plannedQuantity: true,
          completedQuantity: true,
        },
      },
    },
  });

  for (const s of sampleOrders) {
    console.log(`\nPO ${s.poNumber} (${s.styleName}):`);
    for (const stg of s.stages) {
      console.log(`  Stage ${stg.sequence}. ${stg.stageName}: status=${stg.status}, planned=${stg.plannedQuantity.toLocaleString()}, completed=${stg.completedQuantity.toLocaleString()} pcs`);
    }
  }

  // Also verify users count
  const userCount = await prisma.user.count();
  console.log(`Total Users in Database: ${userCount}`);

  await prisma.$disconnect();
}

checkOrders().catch((err) => {
  console.error('Database query failed:', err.message);
  process.exit(1);
});
