import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import * as crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Database...");

  // 1. Roles
  const roles = [
    { name: "Super Admin", code: "SUPER_ADMIN", description: "Full Platform Control", isSystem: true, displayOrder: 1 },
    { name: "Restaurant Owner", code: "OWNER", description: "Complete Restaurant Management", isSystem: true, displayOrder: 2 },
    { name: "Manager", code: "MANAGER", description: "Operational Management", isSystem: true, displayOrder: 3 },
    { name: "Waiter", code: "WAITER", description: "Table Service", isSystem: true, displayOrder: 4 },
    { name: "Kitchen Staff", code: "KITCHEN", description: "Kitchen Operations", isSystem: true, displayOrder: 5 },
    { name: "Cashier", code: "CASHIER", description: "Billing & Payments", isSystem: true, displayOrder: 6 },
    { name: "Customer", code: "CUSTOMER", description: "QR Ordering Customer", isSystem: true, displayOrder: 7 },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
  }
  console.log("✔ Roles");

  // 2. Subscription Plans
  const plans = [
    {
      name: "Starter",
      code: "STARTER",
      description: "Basic plan for small restaurants",
      setupFee: 18000.0,
      monthlyPrice: 1000.0,
      maxTables: 20,
      maxBranches: 1,
      maxStaff: 10,
      monthlyEmailLimit: 1000,
      customDomain: false,
      analyticsEnabled: false,
      prioritySupport: false,
      isActive: true,
      displayOrder: 1,
    },
    {
      name: "Growth",
      code: "GROWTH",
      description: "Standard plan for growing restaurants",
      setupFee: 25000.0,
      monthlyPrice: 1500.0,
      maxTables: 40,
      maxBranches: 3,
      maxStaff: 30,
      monthlyEmailLimit: 5000,
      customDomain: true,
      analyticsEnabled: true,
      prioritySupport: false,
      isActive: true,
      displayOrder: 2,
    },
    {
      name: "Enterprise",
      code: "ENTERPRISE",
      description: "Advanced plan for larger operations and multiple branches",
      setupFee: 30000.0,
      monthlyPrice: 2000.0,
      maxTables: 999999,
      maxBranches: 999999,
      maxStaff: 999999,
      monthlyEmailLimit: 999999,
      customDomain: true,
      analyticsEnabled: true,
      prioritySupport: true,
      isActive: true,
      displayOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  console.log("✔ Plans");

  // 3. Super Admin
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "SUPER_ADMIN" } });
  const adminPasswordHash = await argon2.hash("Admin@123");

  const existingAdmin = await prisma.user.findFirst({
    where: { email: "admin@restaurantos.local", restaurantId: null }
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        roleId: adminRole.id,
        firstName: "System",
        lastName: "Admin",
        passwordHash: adminPasswordHash,
        isActive: true,
        emailVerified: true,
      }
    });
  } else {
    await prisma.user.create({
      data: {
        roleId: adminRole.id,
        firstName: "System",
        lastName: "Admin",
        email: "admin@restaurantos.local",
        passwordHash: adminPasswordHash,
        isActive: true,
        emailVerified: true,
      }
    });
  }
  console.log("✔ Super Admin");

  // 4. Demo Restaurant
  const growthPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "GROWTH" } });
  let demoRestaurant = await prisma.restaurant.findUnique({
    where: { subdomain: "demo" }
  });

  if (!demoRestaurant) {
    demoRestaurant = await prisma.restaurant.create({
      data: {
        name: "Restaurant OS Demo",
        slug: "restaurant-os-demo",
        email: "demo@restaurantos.local",
        phone: "+919876543210",
        subdomain: "demo",
        taxPercentage: 5.0,
        isActive: true,
        emailVerified: true,
        settings: {
          create: {
            timezone: "Asia/Kolkata",
            currency: "INR",
            taxPercentage: 5.0,
          },
        },
        subscription: {
          create: {
            planId: growthPlan.id,
            status: "ACTIVE",
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            monthlyPrice: growthPlan.monthlyPrice,
            setupFee: growthPlan.setupFee,
            maxTables: growthPlan.maxTables,
            maxBranches: growthPlan.maxBranches,
            maxStaff: growthPlan.maxStaff,
            monthlyEmailLimit: growthPlan.monthlyEmailLimit,
          },
        },
      },
    });
  }
  console.log("✔ Restaurant");

  // 5. Demo Owner
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { code: "OWNER" } });
  const ownerPasswordHash = await argon2.hash("Owner@123");

  const existingOwner = await prisma.user.findFirst({
    where: { email: "owner@restaurantos.local", restaurantId: demoRestaurant.id }
  });

  if (existingOwner) {
    await prisma.user.update({
      where: { id: existingOwner.id },
      data: {
        roleId: ownerRole.id,
        firstName: "John",
        lastName: "Doe",
        passwordHash: ownerPasswordHash,
        isActive: true,
        emailVerified: true,
      }
    });
  } else {
    await prisma.user.create({
      data: {
        restaurantId: demoRestaurant.id,
        roleId: ownerRole.id,
        firstName: "John",
        lastName: "Doe",
        email: "owner@restaurantos.local",
        passwordHash: ownerPasswordHash,
        isActive: true,
        emailVerified: true,
      }
    });
  }
  console.log("✔ Demo Owner");

  // 5b. Demo Cashier
  const cashierRole = await prisma.role.findUniqueOrThrow({ where: { code: "CASHIER" } });
  const cashierPasswordHash = await argon2.hash("Cashier@123");

  const existingCashier = await prisma.user.findFirst({
    where: { email: "cashier@restaurantos.local", restaurantId: demoRestaurant.id }
  });

  if (existingCashier) {
    await prisma.user.update({
      where: { id: existingCashier.id },
      data: {
        roleId: cashierRole.id,
        firstName: "Sarah",
        lastName: "Cashier",
        passwordHash: cashierPasswordHash,
        isActive: true,
        emailVerified: true,
      }
    });
  } else {
    await prisma.user.create({
      data: {
        restaurantId: demoRestaurant.id,
        roleId: cashierRole.id,
        firstName: "Sarah",
        lastName: "Cashier",
        email: "cashier@restaurantos.local",
        passwordHash: cashierPasswordHash,
        isActive: true,
        emailVerified: true,
      }
    });
  }
  console.log("✔ Demo Cashier");

  // 6. Demo Branch
  let branch = await prisma.branch.findFirst({
    where: { restaurantId: demoRestaurant.id, name: "Main Branch" }
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        restaurantId: demoRestaurant.id,
        name: "Main Branch",
        code: "MAIN",
        email: "main@restaurantos.local",
        phone: "+919876543210",
        address: "123 Tech Park",
        city: "Bangalore",
        state: "Karnataka",
        country: "India",
        openingTime: "09:00",
        closingTime: "23:00",
        isActive: true,
      }
    });
  }
  console.log("✔ Branch");

  // 7. Demo Tables & QR Codes
  const tableCount = 5;
  for (let i = 1; i <= tableCount; i++) {
    const tableNumber = i;
    const tableName = `Table ${i}`;

    const table = await prisma.table.upsert({
      where: {
        branchId_tableNumber: {
          branchId: branch.id,
          tableNumber,
        },
      },
      update: {
        tableName,
        seatingCapacity: 4,
      },
      create: {
        restaurantId: demoRestaurant.id,
        branchId: branch.id,
        tableNumber,
        tableName,
        seatingCapacity: 4,
      },
    });

    let qrCode = await prisma.qRCode.findUnique({
      where: { tableId: table.id }
    });

    if (!qrCode) {
      const token = crypto.randomBytes(16).toString("hex");
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const baseHost = appUrl.replace(/^https?:\/\//, "");
      const qrUrl = (baseHost.includes("localhost") || baseHost.includes("127.0.0.1") || baseHost.includes("nip.io"))
        ? `http://${baseHost}/qr/${token}`
        : `http://demo.${baseHost}/qr/${token}`;

      qrCode = await prisma.qRCode.create({
        data: {
          restaurantId: demoRestaurant.id,
          branchId: branch.id,
          tableId: table.id,
          qrToken: token,
          qrPath: `/qr/${token}.png`,
          qrUrl,
          isActive: true
        }
      });

      await prisma.table.update({
        where: { id: table.id },
        data: { qrCodeId: qrCode.id }
      });
    }
  }
  console.log("✔ Tables");
  console.log("✔ QR Codes");

  // 8. Categories
  const categories = [
    { name: "Starters", slug: "starters", displayOrder: 1 },
    { name: "Main Course", slug: "main-course", displayOrder: 2 },
    { name: "Beverages", slug: "beverages", displayOrder: 3 },
    { name: "Desserts", slug: "desserts", displayOrder: 4 },
  ];

  const categoryMap: { [key: string]: string } = {};

  for (const cat of categories) {
    const upserted = await prisma.category.upsert({
      where: {
        restaurantId_name: {
          restaurantId: demoRestaurant.id,
          name: cat.name,
        },
      },
      update: cat,
      create: {
        restaurantId: demoRestaurant.id,
        ...cat,
      },
    });
    categoryMap[cat.name] = upserted.id;
  }
  console.log("✔ Categories");

  // 9. Menu Items
  const menuItems = [
    {
      name: "Margherita Pizza",
      slug: "margherita-pizza",
      description: "Classic cheese and tomato pizza.",
      price: 299.0,
      calories: 800,
      preparationTime: 15,
      isVeg: true,
      categoryName: "Main Course",
    },
    {
      name: "Chicken Burger",
      slug: "chicken-burger",
      description: "Crispy chicken patty with lettuce and mayo.",
      price: 199.0,
      calories: 650,
      preparationTime: 12,
      isVeg: false,
      categoryName: "Main Course",
    },
    {
      name: "Veg Burger",
      slug: "veg-burger",
      description: "Delicious potato and veggie patty burger.",
      price: 149.0,
      calories: 550,
      preparationTime: 10,
      isVeg: true,
      categoryName: "Main Course",
    },
    {
      name: "Pasta Alfredo",
      slug: "pasta-alfredo",
      description: "Creamy white sauce pasta with garlic bread.",
      price: 249.0,
      calories: 700,
      preparationTime: 15,
      isVeg: true,
      categoryName: "Main Course",
    },
    {
      name: "French Fries",
      slug: "french-fries",
      description: "Golden crispy potato fries.",
      price: 99.0,
      calories: 300,
      preparationTime: 8,
      isVeg: true,
      categoryName: "Starters",
    },
    {
      name: "Coke",
      slug: "coke",
      description: "Chilled Coca-Cola 330ml.",
      price: 49.0,
      calories: 140,
      preparationTime: 2,
      isVeg: true,
      categoryName: "Beverages",
    },
    {
      name: "Pepsi",
      slug: "pepsi",
      description: "Chilled Pepsi 330ml.",
      price: 49.0,
      calories: 140,
      preparationTime: 2,
      isVeg: true,
      categoryName: "Beverages",
    },
    {
      name: "Brownie",
      slug: "brownie",
      description: "Warm chocolate brownie with chocolate sauce.",
      price: 129.0,
      calories: 450,
      preparationTime: 5,
      isVeg: true,
      categoryName: "Desserts",
    },
    {
      name: "Ice Cream",
      slug: "ice-cream",
      description: "Double scoop vanilla ice cream.",
      price: 89.0,
      calories: 250,
      preparationTime: 3,
      isVeg: true,
      categoryName: "Desserts",
    },
  ];

  const menuItemMap: { [key: string]: string } = {};

  for (const item of menuItems) {
    const categoryId = categoryMap[item.categoryName];

    let menuItem = await prisma.menuItem.findFirst({
      where: {
        restaurantId: demoRestaurant.id,
        name: item.name
      }
    });

    if (menuItem) {
      menuItem = await prisma.menuItem.update({
        where: { id: menuItem.id },
        data: {
          categoryId,
          description: item.description,
          price: item.price,
          calories: item.calories,
          preparationTime: item.preparationTime,
          isVeg: item.isVeg,
        }
      });
    } else {
      menuItem = await prisma.menuItem.create({
        data: {
          restaurantId: demoRestaurant.id,
          categoryId,
          name: item.name,
          slug: item.slug,
          sku: item.slug.toUpperCase(),
          description: item.description,
          price: item.price,
          calories: item.calories,
          preparationTime: item.preparationTime,
          isVeg: item.isVeg,
        }
      });
    }
    menuItemMap[item.name] = menuItem.id;
  }
  console.log("✔ Menu Items");

  // 10. Variants
  const variants = [
    { menuItemName: "Margherita Pizza", name: "Small", price: 199.0 },
    { menuItemName: "Margherita Pizza", name: "Medium", price: 299.0 },
    { menuItemName: "Margherita Pizza", name: "Large", price: 399.0 },
    { menuItemName: "Chicken Burger", name: "Single", price: 199.0 },
    { menuItemName: "Chicken Burger", name: "Double", price: 279.0 },
    { menuItemName: "Veg Burger", name: "Single", price: 149.0 },
    { menuItemName: "Veg Burger", name: "Double", price: 199.0 },
    { menuItemName: "Coke", name: "250ml", price: 39.0 },
    { menuItemName: "Coke", name: "500ml", price: 59.0 },
    { menuItemName: "Coke", name: "1L", price: 89.0 },
    { menuItemName: "Pepsi", name: "250ml", price: 39.0 },
    { menuItemName: "Pepsi", name: "500ml", price: 59.0 },
    { menuItemName: "Pepsi", name: "1L", price: 89.0 },
  ];

  for (const v of variants) {
    const menuItemId = menuItemMap[v.menuItemName];
    if (menuItemId) {
      let variant = await prisma.variant.findFirst({
        where: {
          menuItemId,
          name: v.name
        }
      });

      if (variant) {
        await prisma.variant.update({
          where: { id: variant.id },
          data: { price: v.price }
        });
      } else {
        await prisma.variant.create({
          data: {
            restaurantId: demoRestaurant.id,
            menuItemId,
            name: v.name,
            price: v.price
          }
        });
      }
    }
  }
  console.log("✔ Variants");

  // 11. Add-ons
  const addons = [
    { name: "Extra Cheese", price: 50.0 },
    { name: "Extra Sauce", price: 20.0 },
    { name: "Mayo", price: 15.0 },
    { name: "Jalapeños", price: 30.0 },
    { name: "Extra Patty", price: 80.0 },
  ];

  for (const a of addons) {
    let addon = await prisma.addon.findFirst({
      where: {
        restaurantId: demoRestaurant.id,
        name: a.name
      }
    });

    if (addon) {
      await prisma.addon.update({
        where: { id: addon.id },
        data: { additionalPrice: a.price }
      });
    } else {
      await prisma.addon.create({
        data: {
          restaurantId: demoRestaurant.id,
          name: a.name,
          additionalPrice: a.price
        }
      });
    }
  }
  console.log("✔ Add-ons");

  // 12. Staff
  const staffData = [
    { roleCode: "MANAGER", email: "manager@restaurantos.local", firstName: "Manager", lastName: "OS", pass: "Manager@123" },
    { roleCode: "WAITER", email: "waiter@restaurantos.local", firstName: "Waiter", lastName: "OS", pass: "Waiter@123" },
    { roleCode: "KITCHEN", email: "kitchen@restaurantos.local", firstName: "Kitchen", lastName: "OS", pass: "Kitchen@123" },
    { roleCode: "CASHIER", email: "cashier@restaurantos.local", firstName: "Cashier", lastName: "OS", pass: "Cashier@123" },
  ];

  for (const staff of staffData) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: staff.roleCode } });
    const passwordHash = await argon2.hash(staff.pass);

    const existingStaff = await prisma.user.findFirst({
      where: { email: staff.email, restaurantId: demoRestaurant.id }
    });

    if (existingStaff) {
      await prisma.user.update({
        where: { id: existingStaff.id },
        data: {
          roleId: role.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          passwordHash,
          isActive: true,
          emailVerified: true,
        }
      });
    } else {
      await prisma.user.create({
        data: {
          restaurantId: demoRestaurant.id,
          roleId: role.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          passwordHash,
          isActive: true,
          emailVerified: true,
        }
      });
    }
  }
  console.log("✔ Staff");

  // 13. Demo Customer
  const customer = await prisma.customer.upsert({
    where: {
      restaurantId_phone: {
        restaurantId: demoRestaurant.id,
        phone: "+919999999999"
      }
    },
    update: {
      name: "Test Customer",
      totalOrders: 3,
      totalSpent: 846.00
    },
    create: {
      restaurantId: demoRestaurant.id,
      phone: "+919999999999",
      name: "Test Customer",
      totalOrders: 3,
      totalSpent: 846.00
    }
  });

  // 14. Demo Orders (Completed, Preparing, Ready states)
  const targetTable = await prisma.table.findFirst({
    where: { branchId: branch.id, tableNumber: 1 }
  });

  if (targetTable) {
    let session = await prisma.tableSession.findFirst({
      where: { tableId: targetTable.id, status: "OPEN" }
    });

    if (!session) {
      session = await prisma.tableSession.create({
        data: {
          restaurantId: demoRestaurant.id,
          branchId: branch.id,
          tableId: targetTable.id,
          sessionNumber: `SES-DEMO-${Date.now().toString().slice(-6)}`,
          status: "OPEN",
          totalAmount: 846.00
        }
      });
    }

    // Order 1: Completed
    const order1Num = `ORD-DEMO-101`;
    const existingOrder1 = await prisma.order.findFirst({
      where: { orderNumber: order1Num, restaurantId: demoRestaurant.id }
    });
    if (!existingOrder1) {
      await prisma.order.create({
        data: {
          restaurantId: demoRestaurant.id,
          branchId: branch.id,
          tableId: targetTable.id,
          customerId: customer.id,
          orderNumber: order1Num,
          sessionId: session.id,
          subtotal: 348.00,
          tax: 0.00,
          totalAmount: 348.00,
          notes: "Extra napkins please",
          orderStatus: "COMPLETED",
          paymentStatus: "PAID",
          orderItems: {
            create: [
              {
                menuItemId: menuItemMap["French Fries"],
                quantity: 2,
                unitPrice: 99.00,
                tax: 0.00,
                subtotal: 198.00
              },
              {
                menuItemId: menuItemMap["Coke"],
                quantity: 3,
                unitPrice: 49.00,
                tax: 0.00,
                subtotal: 147.00
              }
            ]
          }
        }
      });
    }

    // Order 2: Preparing
    const order2Num = `ORD-DEMO-102`;
    const existingOrder2 = await prisma.order.findFirst({
      where: { orderNumber: order2Num, restaurantId: demoRestaurant.id }
    });
    if (!existingOrder2) {
      await prisma.order.create({
        data: {
          restaurantId: demoRestaurant.id,
          branchId: branch.id,
          tableId: targetTable.id,
          customerId: customer.id,
          orderNumber: order2Num,
          sessionId: session.id,
          subtotal: 299.00,
          tax: 0.00,
          totalAmount: 299.00,
          notes: "Make it spicy",
          orderStatus: "PREPARING",
          paymentStatus: "PENDING",
          orderItems: {
            create: [
              {
                menuItemId: menuItemMap["Margherita Pizza"],
                quantity: 1,
                unitPrice: 299.00,
                tax: 0.00,
                subtotal: 299.00
              }
            ]
          }
        }
      });
    }

    // Order 3: Ready
    const order3Num = `ORD-DEMO-103`;
    const existingOrder3 = await prisma.order.findFirst({
      where: { orderNumber: order3Num, restaurantId: demoRestaurant.id }
    });
    if (!existingOrder3) {
      await prisma.order.create({
        data: {
          restaurantId: demoRestaurant.id,
          branchId: branch.id,
          tableId: targetTable.id,
          customerId: customer.id,
          orderNumber: order3Num,
          sessionId: session.id,
          subtotal: 199.00,
          tax: 0.00,
          totalAmount: 199.00,
          notes: "No onions",
          orderStatus: "READY",
          paymentStatus: "PENDING",
          orderItems: {
            create: [
              {
                menuItemId: menuItemMap["Chicken Burger"],
                quantity: 1,
                unitPrice: 199.00,
                tax: 0.00,
                subtotal: 199.00
              }
            ]
          }
        }
      });
    }
  }
  console.log("✔ Demo Orders");

  console.log("✔ Completed");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
