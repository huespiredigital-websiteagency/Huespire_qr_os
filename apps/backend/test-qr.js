const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const qrs = await prisma.qRCode.findMany({
    where: { isActive: true },
    include: {
      table: {
        include: {
          branch: {
            include: { restaurant: true }
          }
        }
      }
    },
    take: 5
  });
  
  if (qrs.length > 0) {
    console.log("FOUND_QRS:", qrs.map(q => ({
      token: q.qrToken,
      restaurant: q.table?.branch?.restaurant?.name,
      branch: q.table?.branch?.name,
      table: q.table?.tableNumber
    })));
  } else {
    console.log("NO_QR");
  }
  await prisma.$disconnect();
}

run().catch(console.error);
