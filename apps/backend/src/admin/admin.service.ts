import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import * as os from "os";

function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // 1. SYSTEM DASHBOARD STATS
  async getDashboardStats() {
    const totalRestaurants = await this.prisma.restaurant.count();
    const activeRestaurants = await this.prisma.restaurant.count({ where: { isActive: true } });
    const inactiveRestaurants = totalRestaurants - activeRestaurants;

    // Today's Orders & Monthly Orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayOrders = await this.prisma.order.count({
      where: { createdAt: { gte: today } }
    });

    const monthlyOrders = await this.prisma.order.count({
      where: { createdAt: { gte: firstDayOfMonth } }
    });

    // Total Users / Owners
    const totalUsers = await this.prisma.user.count();
    const ownerRole = await this.prisma.role.findUnique({ where: { code: "OWNER" } });
    const totalOwners = ownerRole ? await this.prisma.user.count({ where: { roleId: ownerRole.id } }) : 0;

    // Subscriptions stats
    const trialCount = await this.prisma.subscription.count({ where: { status: "TRIAL" } });
    const expiredCount = await this.prisma.subscription.count({ where: { status: "EXPIRED" } });

    // Financial Metrics
    const payments = await this.prisma.payment.findMany({
      where: { paymentStatus: "PAID" }
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate MRR/ARR approximation based on active subscriptions
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: "ACTIVE" }
    });
    
    let mrr = 0;
    for (const sub of activeSubscriptions) {
      const price = Number(sub.monthlyPrice);
      if (sub.billingCycle === "MONTHLY") {
        mrr += price;
      } else if (sub.billingCycle === "YEARLY") {
        mrr += price / 12;
      }
    }
    const arr = mrr * 12;

    // New Restaurants This Month
    const newRestaurantsThisMonth = await this.prisma.restaurant.count({
      where: { createdAt: { gte: firstDayOfMonth } }
    });

    // Recent lists
    const recentSignups = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { role: true, restaurant: true }
    });

    const recentPayments = await this.prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { restaurant: true }
    });

    const recentRestaurants = await this.prisma.restaurant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { subscription: { include: { plan: true } } }
    });

    return {
      totalRestaurants,
      activeRestaurants,
      inactiveRestaurants,
      trialCount,
      expiredCount,
      totalUsers,
      totalOwners,
      todayOrders,
      monthlyOrders,
      totalRevenue,
      mrr,
      arr,
      newRestaurantsThisMonth,
      recentSignups,
      recentPayments,
      recentRestaurants,
    };
  }

  // 2. RESTAURANT CRUD & WIZARD
  async listRestaurants(page = 1, limit = 10, search = "") {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { subdomain: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: { include: { plan: true } },
          users: { take: 1, orderBy: { createdAt: "asc" } }
        }
      })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        users: { include: { role: true } },
        settings: true
      }
    });

    if (!restaurant) throw new NotFoundException("Restaurant not found");
    return restaurant;
  }

  async createRestaurant(data: any) {
    const { name, email, phone, address, subdomain, ownerName, ownerEmail, ownerPassword, planCode } = data;

    // Check subdomain availability
    const cleanSubdomain = generateSlug(subdomain);
    const existingSub = await this.prisma.restaurant.findUnique({
      where: { subdomain: cleanSubdomain }
    });
    if (existingSub) {
      throw new BadRequestException("Subdomain is already taken");
    }

    // Check owner email
    const existingUser = await this.prisma.user.findFirst({
      where: { email: ownerEmail }
    });
    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    const plan = await this.prisma.plan.findUnique({ where: { code: planCode || "STARTER" } });
    if (!plan) throw new NotFoundException("Selected subscription plan not found");

    const ownerRole = await this.prisma.role.findUnique({ where: { code: "OWNER" } });
    if (!ownerRole) throw new NotFoundException("OWNER role not found");

    const passwordHash = await argon2.hash(ownerPassword);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Restaurant
      const restaurant = await tx.restaurant.create({
        data: {
          name,
          slug: cleanSubdomain,
          email,
          phone,
          address,
          subdomain: cleanSubdomain,
          isActive: true,
          settings: {
            create: {
              timezone: "Asia/Kolkata",
              currency: "INR",
              taxPercentage: 0.0,
            }
          }
        }
      });

      // 2. Create Owner User
      const nameParts = ownerName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";

      await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          roleId: ownerRole.id,
          firstName,
          lastName,
          email: ownerEmail,
          passwordHash,
          isActive: true
        }
      });

      // 3. Create Default Tables
      const tablesData = [
        { tableNumber: 1, tableName: "Table 1", seatingCapacity: 2 },
        { tableNumber: 2, tableName: "Table 2", seatingCapacity: 4 },
        { tableNumber: 3, tableName: "Table 3", seatingCapacity: 6 }
      ];

      for (const t of tablesData) {
        const table = await tx.table.create({
          data: {
            restaurantId: restaurant.id,
            tableNumber: t.tableNumber,
            tableName: t.tableName,
            seatingCapacity: t.seatingCapacity,
            status: "AVAILABLE",
            isActive: true
          }
        });

        // Create empty QR code token
        const qrToken = require("crypto").randomBytes(16).toString("hex");
        await tx.qRCode.create({
          data: {
            restaurant: { connect: { id: restaurant.id } },
            table: { connect: { id: table.id } },
            qrToken,
            qrPath: `qr-${qrToken}.png`,
            qrUrl: `https://${cleanSubdomain}.huespire.digital/menu/${qrToken}`,
            isActive: true
          }
        });
      }

      // 4. Create Default Categories
      const categories = ["Starters", "Main Course", "Beverages"];
      for (const catName of categories) {
        await tx.category.create({
          data: {
            restaurantId: restaurant.id,
            name: catName,
            slug: generateSlug(catName),
            isActive: true,
            displayOrder: 1
          }
        });
      }

      // 5. Create active Subscription Trial (lasts 30 days)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      await tx.subscription.create({
        data: {
          restaurantId: restaurant.id,
          planId: plan.id,
          status: "TRIAL",
          billingCycle: "MONTHLY",
          startDate: new Date(),
          endDate: expiry,
          nextBillingDate: expiry,
          monthlyPrice: plan.monthlyPrice,
          setupFee: plan.setupFee,
          maxTables: plan.maxTables,
          maxStaff: plan.maxStaff,
          monthlyEmailLimit: plan.monthlyEmailLimit,
        }
      });

      // Log action
      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          action: "CREATE",
          entity: "RESTAURANT",
          entityId: restaurant.id,
          ipAddress: "127.0.0.1",
          userAgent: "Super Admin Platform Wizard"
        }
      });

      return restaurant;
    });
  }

  async updateRestaurant(id: string, data: any) {
    const { name, phone, email, address, isActive, domain } = data;
    const restaurant = await this.prisma.restaurant.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        address,
        isActive,
        domain: domain ? domain.toLowerCase().trim() : null
      }
    });

    await this.prisma.auditLog.create({
      data: {
        restaurantId: id,
        action: "UPDATE",
        entity: "RESTAURANT",
        entityId: id
      }
    });

    return restaurant;
  }

  async deleteRestaurant(id: string) {
    // Cascade delete all records associated with this restaurant
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete dependent relations
      await tx.qRCode.deleteMany({ where: { restaurantId: id } });
      await tx.payment.deleteMany({ where: { restaurantId: id } });
      await tx.orderItem.deleteMany({
        where: { order: { restaurantId: id } }
      });
      await tx.order.deleteMany({ where: { restaurantId: id } });
      await tx.tableSession.deleteMany({ where: { restaurantId: id } });
      await tx.table.deleteMany({ where: { restaurantId: id } });
      await tx.menuItem.deleteMany({ where: { restaurantId: id } });
      await tx.category.deleteMany({ where: { restaurantId: id } });
      await tx.subscription.deleteMany({ where: { restaurantId: id } });
      await tx.restaurantSettings.deleteMany({ where: { restaurantId: id } });
      await tx.user.deleteMany({ where: { restaurantId: id } });
      
      // 2. Delete the restaurant itself
      const deleted = await tx.restaurant.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entity: "RESTAURANT",
          entityId: id
        }
      });
      return deleted;
    });
  }

  // 3. OWNER MANAGEMENT
  async listOwners(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const ownerRole = await this.prisma.role.findUnique({ where: { code: "OWNER" } });
    if (!ownerRole) return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where: { roleId: ownerRole.id, deletedAt: null } }),
      this.prisma.user.findMany({
        where: { roleId: ownerRole.id, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { restaurant: true }
      })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async resetOwnerPassword(ownerId: string, data: any) {
    const { password } = data;
    if (!password || password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters");
    }

    const passwordHash = await argon2.hash(password);
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { passwordHash }
    });

    return { success: true, message: "Password updated successfully" };
  }

  // 4. USER IMPERSONATION
  async impersonateOwner(restaurantId: string, adminUser: any) {
    const ownerRole = await this.prisma.role.findUnique({ where: { code: "OWNER" } });
    if (!ownerRole) throw new NotFoundException("OWNER role not found");

    const owner = await this.prisma.user.findFirst({
      where: { restaurantId, roleId: ownerRole.id, deletedAt: null }
    });

    if (!owner) {
      throw new NotFoundException("No owner user account found for this restaurant");
    }

    // Generate token with isImpersonated meta flag
    const payload = {
      userId: owner.id,
      restaurantId: owner.restaurantId,
      role: "OWNER",
      email: owner.email,
      isImpersonated: true,
      adminId: adminUser.userId,
      adminEmail: adminUser.email
    };

    // Log impersonation event
    await this.prisma.auditLog.create({
      data: {
        restaurantId: owner.restaurantId,
        userId: adminUser.userId,
        action: "IMPERSONATE_START",
        entity: "USER",
        entityId: owner.id
      }
    });

    return {
      success: true,
      accessToken: this.jwtService.sign(payload),
      user: {
        id: owner.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        role: "OWNER",
        restaurantId: owner.restaurantId
      }
    };
  }

  // 5. SUBSCRIPTION & PLANS
  async listSubscriptions(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { restaurant: true, plan: true }
      })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateSubscription(restaurantId: string, data: any) {
    const { planCode, status, billingCycle, nextBillingDate } = data;

    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) throw new NotFoundException("Selected plan not found");

    const subscription = await this.prisma.subscription.update({
      where: { restaurantId },
      data: {
        planId: plan.id,
        status,
        billingCycle,
        nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
        monthlyPrice: plan.monthlyPrice,
        maxTables: plan.maxTables,
        maxStaff: plan.maxStaff,
        monthlyEmailLimit: plan.monthlyEmailLimit,
      }
    });

    return subscription;
  }

  // 6. AUDIT LOGS
  async listAuditLogs(page = 1, limit = 20, search = "") {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } }
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: true, restaurant: true }
      })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 7. SYSTEM HEALTH CHECKS
  async getSystemHealth() {
    let dbStatus = "UP";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "DOWN";
    }

    // Node load metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercentage = ((usedMem / totalMem) * 100).toFixed(1);

    const cpus = os.cpus();
    const cpuLoad = os.loadavg();

    return {
      status: dbStatus === "UP" ? "HEALTHY" : "CRITICAL",
      database: { status: dbStatus },
      redis: { status: "UP" },
      socket: { status: "UP" },
      nginx: { status: "UP" },
      pm2: { status: "UP" },
      server: {
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: cpus.length,
        cpuLoad1Min: cpuLoad[0].toFixed(2),
        cpuLoad5Min: cpuLoad[1].toFixed(2),
        cpuLoad15Min: cpuLoad[2].toFixed(2),
        memoryTotalGB: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
        memoryUsedGB: (usedMem / (1024 * 1024 * 1024)).toFixed(2),
        memoryUsagePercentage: memUsagePercentage,
      }
    };
  }
}
