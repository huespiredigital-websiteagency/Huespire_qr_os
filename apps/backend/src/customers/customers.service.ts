import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Searches and filters customers inside a restaurant tenant.
   */
  async getCustomers(params: {
    restaurantId: string;
    search?: string;
    vipStatus?: boolean;
    tag?: string;
    limit?: number;
    offset?: number;
  }) {
    const { restaurantId, search, vipStatus, tag, limit = 50, offset = 0 } = params;

    const whereClause: any = {
      restaurantId,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (vipStatus !== undefined) {
      whereClause.vipStatus = vipStatus;
    }

    if (tag) {
      whereClause.tags = { contains: tag, mode: "insensitive" };
    }

    const [customers, totalCount] = await Promise.all([
      this.prisma.customer.findMany({
        where: whereClause,
        orderBy: { totalSpent: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.customer.count({ where: whereClause }),
    ]);

    return {
      customers: customers.map((c) => ({
        ...c,
        averageOrderValue: c.totalOrders > 0 ? Number((Number(c.totalSpent) / c.totalOrders).toFixed(2)) : 0,
      })),
      totalCount,
    };
  }

  /**
   * Fetches detailed customer profile metrics, timeline, and audit logs.
   */
  async getCustomerProfile(restaurantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, restaurantId },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            table: true,
            orderItems: { include: { menuItem: true } },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }

    // Compute metrics
    const averageOrderValue =
      customer.totalOrders > 0
        ? Number((Number(customer.totalSpent) / customer.totalOrders).toFixed(2))
        : 0;

    // Fetch email history logs
    const emailHistory = customer.email
      ? await this.prisma.emailLog.findMany({
          where: { recipient: customer.email, restaurantId },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return {
      ...customer,
      averageOrderValue,
      emailHistory,
    };
  }

  /**
   * Updates notes, tags, and VIP status properties.
   */
  async updateCustomer(
    restaurantId: string,
    id: string,
    data: {
      notes?: string;
      vipStatus?: boolean;
      tags?: string;
    }
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, restaurantId },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        notes: data.notes !== undefined ? data.notes : undefined,
        vipStatus: data.vipStatus !== undefined ? data.vipStatus : undefined,
        tags: data.tags !== undefined ? data.tags : undefined,
      },
    });
  }

  /**
   * Generates a CSV file containing all filtered customer entries.
   */
  async exportCustomersCsv(restaurantId: string, search?: string): Promise<string> {
    const { customers } = await this.getCustomers({ restaurantId, search, limit: 10000 });

    const headers = [
      "Name",
      "Phone",
      "Email",
      "Total Orders",
      "Lifetime Spend",
      "Average Order Value",
      "VIP Status",
      "Loyalty Points",
      "Tags",
      "Notes",
    ];
    const rows = customers.map((c) => [
      c.name,
      c.phone,
      c.email || "",
      c.totalOrders,
      Number(c.totalSpent).toFixed(2),
      c.averageOrderValue,
      c.vipStatus ? "Yes" : "No",
      c.loyaltyPoints,
      c.tags || "",
      c.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val.toString().replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return csvContent;
  }

  /**
   * Sends bulk email communication campaign
   */
  async sendBulkEmail(
    restaurantId: string,
    targetTag?: string,
    vipOnly?: boolean,
    subject?: string,
    body?: string
  ): Promise<{ successCount: number; failedCount: number }> {
    if (!subject || !body) {
      throw new BadRequestException("Subject and body are required for campaign");
    }

    // Resolve target customers
    const where: any = { restaurantId, email: { not: null } };
    if (vipOnly) {
      where.vipStatus = true;
    }
    if (targetTag) {
      where.tags = { contains: targetTag, mode: "insensitive" };
    }

    const recipients = await this.prisma.customer.findMany({ where });

    let successCount = 0;
    let failedCount = 0;

    for (const customer of recipients) {
      if (!customer.email) continue;

      const baseLayout = `
        <h2>Platform Campaign Broadcast</h2>
        <p>Dear ${customer.name},</p>
        <p>${body.replace(/\n/g, "<br>")}</p>
      `;

      // We'll wrap in base branding design inside EmailService automatically
      const sent = await this.emailService.sendEmail(
        customer.email,
        subject,
        baseLayout,
        restaurantId
      );

      if (sent) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    return { successCount, failedCount };
  }
}
