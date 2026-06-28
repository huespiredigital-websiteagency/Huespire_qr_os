import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { InviteStaffDto } from "./dto/invite-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";
import * as argon2 from "argon2";
import { User } from "@prisma/client";

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async findAll(restaurantId: string) {
    return this.prisma.user.findMany({
      where: { restaurantId, deletedAt: null },
      include: { role: true },
      orderBy: { firstName: "asc" },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: { role: true },
    });

    if (!staff) {
      throw new NotFoundException("Staff member not found");
    }

    return staff;
  }

  async invite(restaurantId: string, dto: InviteStaffDto) {
    // 1. Enforce subscription staff limits
    const quota = await this.subscriptionsService.hasQuota(restaurantId, "staff");
    if (!quota.allowed) {
      throw new ForbiddenException(`Staff limit reached (${quota.max}). Please upgrade your subscription plan.`);
    }

    // 2. Check email uniqueness within restaurant
    const existing = await this.prisma.user.findFirst({
      where: {
        restaurantId,
        email: dto.email,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException("A staff member with this email already exists in your restaurant.");
    }

    // 3. Find target role
    const role = await this.prisma.role.findUnique({
      where: { code: dto.roleCode },
    });

    if (!role) {
      throw new NotFoundException(`Role ${dto.roleCode} not found`);
    }

    // 4. Generate temporary password
    const temporaryPassword = `Staff@${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const passwordHash = await argon2.hash(temporaryPassword);

    const user = await this.prisma.user.create({
      data: {
        restaurantId,
        roleId: role.id,
        firstName: dto.firstName,
        lastName: dto.lastName || "",
        email: dto.email,
        phone: dto.phone || null,
        passwordHash,
        isActive: true,
        emailVerified: true,
      },
      include: { role: true },
    });

    return {
      user,
      temporaryPassword,
    };
  }

  async update(restaurantId: string, id: string, dto: UpdateStaffDto) {
    const staff = await this.findOne(restaurantId, id);

    const updateData: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      isActive: dto.isActive,
    };

    if (dto.roleCode) {
      const role = await this.prisma.role.findUnique({
        where: { code: dto.roleCode },
      });
      if (!role) {
        throw new NotFoundException(`Role ${dto.roleCode} not found`);
      }
      updateData.roleId = role.id;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
  }

  async remove(restaurantId: string, id: string): Promise<User> {
    const staff = await this.findOne(restaurantId, id);

    if (staff.role.code === "OWNER") {
      throw new ForbiddenException("Cannot delete the restaurant owner account.");
    }

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
