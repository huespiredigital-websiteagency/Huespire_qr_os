import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Subscription } from "@prisma/client";
import { PaginationDto, PaginatedResult } from "../common/dto/pagination.dto";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(paginationDto?: PaginationDto): Promise<PaginatedResult<Subscription>> {
    const page = Number(paginationDto?.page) || 1;
    const limit = Number(paginationDto?.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = paginationDto?.sortBy || "createdAt";
    const sortOrder = (paginationDto?.sortOrder || "desc").toLowerCase() as "asc" | "desc";

    const [total, data] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { plan: true }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getSubscription(restaurantId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException("Subscription not found for this restaurant");
    }

    return subscription;
  }

  async upgrade(restaurantId: string, planId: string): Promise<Subscription> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException("Active plan not found");
    }

    return this.prisma.subscription.update({
      where: { restaurantId },
      data: {
        planId: plan.id,
        monthlyPrice: plan.monthlyPrice,
        setupFee: plan.setupFee,
        maxTables: plan.maxTables,
        maxStaff: plan.maxStaff,
        monthlyEmailLimit: plan.monthlyEmailLimit,
      },
      include: { plan: true },
    });
  }

  async hasQuota(
    restaurantId: string,
    limitType: "tables" | "staff",
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      return { allowed: false, current: 0, max: 0 };
    }

    let current = 0;
    let max = 0;

    if (limitType === "tables") {
      current = await this.prisma.table.count({
        where: { restaurantId, deletedAt: null },
      });
      max = subscription.maxTables;
    } else if (limitType === "staff") {
      current = await this.prisma.user.count({
        where: { restaurantId, deletedAt: null },
      });
      max = subscription.maxStaff;
    }

    return {
      allowed: current < max,
      current,
      max,
    };
  }
}
