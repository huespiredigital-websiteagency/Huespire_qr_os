const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("Seeding test menu items for Restaurant B and Restaurant C...");

  // 1. Seed Restaurant B
  const qrB = await prisma.qRCode.findUnique({
    where: { qrToken: 'c22064998cf35675d02e899ada2e388c' },
    include: { table: { include: { branch: true } } }
  });

  if (qrB && qrB.table && qrB.table.branch) {
    const restaurantId = qrB.restaurantId;
    const category = await prisma.category.upsert({
      where: { restaurantId_name: { restaurantId, name: 'Pizzas' } },
      update: { isActive: true, deletedAt: null },
      create: { restaurantId, name: 'Pizzas', slug: 'pizzas', displayOrder: 1, isActive: true }
    });

    const menuItem = await prisma.menuItem.upsert({
      where: { restaurantId_sku: { restaurantId, sku: 'PIZ-MARG-01' } },
      update: { isAvailable: true, deletedAt: null, categoryId: category.id, price: 250.00 },
      create: {
        restaurantId,
        categoryId: category.id,
        name: 'Margherita Pizza',
        slug: 'margherita-pizza',
        description: 'Classic cheese and fresh tomato pizza.',
        price: 250.00,
        sku: 'PIZ-MARG-01',
        isVeg: true,
        isAvailable: true
      }
    });

    // Variant & Addon
    await prisma.variant.findFirst({
      where: { menuItemId: menuItem.id, name: 'Regular' }
    }).then(async (exists) => {
      if (!exists) {
        await prisma.variant.create({
          data: { restaurantId, menuItemId: menuItem.id, name: 'Regular', price: 200.00, isAvailable: true }
        });
      }
    });

    await prisma.addon.findFirst({
      where: { restaurantId, name: 'Extra Cheese' }
    }).then(async (exists) => {
      if (!exists) {
        await prisma.addon.create({
          data: { restaurantId, name: 'Extra Cheese', additionalPrice: 50.00, isActive: true }
        });
      }
    });
    console.log("Restaurant B seeding verified.");
  }

  // 2. Seed Restaurant C
  const qrC = await prisma.qRCode.findUnique({
    where: { qrToken: '6c37b7e10416209b71539d484e55a415' },
    include: { table: { include: { branch: true } } }
  });

  if (qrC && qrC.table && qrC.table.branch) {
    const restaurantId = qrC.restaurantId;
    const category = await prisma.category.upsert({
      where: { restaurantId_name: { restaurantId, name: 'Drinks' } },
      update: { isActive: true, deletedAt: null },
      create: { restaurantId, name: 'Drinks', slug: 'drinks', displayOrder: 1, isActive: true }
    });

    const menuItem = await prisma.menuItem.upsert({
      where: { restaurantId_sku: { restaurantId, sku: 'DRK-COLA-01' } },
      update: { isAvailable: true, deletedAt: null, categoryId: category.id, price: 60.00 },
      create: {
        restaurantId,
        categoryId: category.id,
        name: 'Coca Cola',
        slug: 'coca-cola',
        description: 'Chilled soft drink.',
        price: 60.00,
        sku: 'DRK-COLA-01',
        isVeg: true,
        isAvailable: true
      }
    });
    console.log("Restaurant C seeding verified.");
  }

  console.log("All seeding complete!");
  await prisma.$disconnect();
}

run().catch(console.error);
