import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Plan } from "@prisma/client";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";

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
        maxBranches: createPlanDto.maxBranches,
        maxStaff: createPlanDto.maxStaff,
        monthlyEmailLimit: createPlanDto.monthlyEmailLimit,
        customDomain: createPlanDto.customDomain,
        analyticsEnabled: createPlanDto.analyticsEnabled,
        prioritySupport: createPlanDto.prioritySupport
      }
    });
  }

  async findAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany();
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