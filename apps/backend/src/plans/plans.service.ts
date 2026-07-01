import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Plan } from "@prisma/client";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";

import { PaginationDto, PaginatedResult } from "../common/dto/pagination.dto";

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    return this.prisma.plan.create({
      data: {
        name: createPlanDto.name,
        code: createPlanDto.code,
        description: createPlanDto.description,
        setupFee: createPlanDto.setupFee,
        monthlyPrice: createPlanDto.monthlyPrice,
        maxTables: createPlanDto.maxTables,
        maxStaff: createPlanDto.maxStaff,
        monthlyEmailLimit: createPlanDto.monthlyEmailLimit,
        customDomain: createPlanDto.customDomain,
        analyticsEnabled: createPlanDto.analyticsEnabled,
        prioritySupport: createPlanDto.prioritySupport
      }
    });
  }

  async findAll(paginationDto?: PaginationDto): Promise<PaginatedResult<Plan>> {
    const page = Number(paginationDto?.page) || 1;
    const limit = Number(paginationDto?.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = paginationDto?.sortBy || "displayOrder";
    const sortOrder = (paginationDto?.sortOrder || "asc").toLowerCase() as "asc" | "desc";

    const [total, data] = await Promise.all([
      this.prisma.plan.count({ where: { isActive: true } }),
      this.prisma.plan.findMany({
        where: { isActive: true },
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

  async findOne(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({
      where: { id }
    });
  }

  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    return this.prisma.plan.update({
      where: { id },
      data: updatePlanDto
    });
  }

  async remove(id: string): Promise<Plan> {
    return this.prisma.plan.delete({
      where: { id }
    });
  }
}