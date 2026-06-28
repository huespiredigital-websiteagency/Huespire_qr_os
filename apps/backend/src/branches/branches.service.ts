import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { Branch } from "@prisma/client";

import { PaginationDto, PaginatedResult } from "../common/dto/pagination.dto";

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async findAll(restaurantId: string, paginationDto?: PaginationDto): Promise<PaginatedResult<Branch>> {
    const page = Number(paginationDto?.page) || 1;
    const limit = Number(paginationDto?.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = paginationDto?.sortBy || "createdAt";
    const sortOrder = (paginationDto?.sortOrder || "desc").toLowerCase() as "asc" | "desc";

    const [total, data] = await Promise.all([
      this.prisma.branch.count({ where: { restaurantId, deletedAt: null } }),
      this.prisma.branch.findMany({
        where: { restaurantId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
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

  async findOne(restaurantId: string, id: string): Promise<Branch> {
    const branch = await this.prisma.branch.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    return branch;
  }

  async create(restaurantId: string, dto: CreateBranchDto): Promise<Branch> {
    // 1. Enforce subscription branch limits
    const quota = await this.subscriptionsService.hasQuota(restaurantId, "branches");
    if (!quota.allowed) {
      throw new ForbiddenException(`Branch limit reached (${quota.max}). Please upgrade your subscription plan.`);
    }

    // 2. Enforce code uniqueness per restaurant
    const existing = await this.prisma.branch.findUnique({
      where: {
        restaurantId_code: {
          restaurantId,
          code: dto.code,
        },
      },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException("A branch with this code already exists for your restaurant.");
    }

    // 3. Determine if this should be the main branch (if no other branches exist)
    const existingCount = await this.prisma.branch.count({
      where: { restaurantId, deletedAt: null },
    });
    const isMainBranch = existingCount === 0;

    return this.prisma.branch.create({
      data: {
        restaurantId,
        name: dto.name,
        code: dto.code,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        openingTime: dto.openingTime,
        closingTime: dto.closingTime,
        isMainBranch,
      },
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    // Ensure branch exists and belongs to tenant
    await this.findOne(restaurantId, id);

    if (dto.code) {
      const existing = await this.prisma.branch.findFirst({
        where: {
          restaurantId,
          code: dto.code,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (existing) {
        throw new ConflictException("A branch with this code already exists.");
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async remove(restaurantId: string, id: string): Promise<Branch> {
    const branch = await this.findOne(restaurantId, id);

    if (branch.isMainBranch) {
      throw new ForbiddenException("Cannot delete the main branch of a restaurant.");
    }

    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
