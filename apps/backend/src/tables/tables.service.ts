import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { QRService } from "../qr/qr.service";
import { CreateTableDto } from "./dto/create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";
import { Table } from "@prisma/client";

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly qrService: QRService,
  ) {}

  async findAll(restaurantId: string, branchId?: string): Promise<Table[]> {
    return this.prisma.table.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        qrCode: true,
        branch: true,
      },
    });
  }

  async findOne(restaurantId: string, id: string): Promise<Table> {
    const table = await this.prisma.table.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: { qrCode: true, branch: true },
    });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    return table;
  }

  async create(restaurantId: string, dto: CreateTableDto): Promise<Table> {
    // 1. Validate branch exists and belongs to tenant
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, restaurantId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    // 2. Validate subscription table limit
    const quota = await this.subscriptionsService.hasQuota(restaurantId, "tables");
    if (!quota.allowed) {
      throw new ForbiddenException(`Table limit reached (${quota.max}). Please upgrade your subscription plan.`);
    }

    // 3. Check table number uniqueness in the branch
    const existing = await this.prisma.table.findFirst({
      where: {
        branchId: dto.branchId,
        tableNumber: dto.tableNumber,
      },
      include: {
        qrCode: true,
      },
    });

    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException("A table with this number already exists in this branch.");
      } else {
        // Clean up conflicting soft-deleted table and its QR code
        await this.prisma.qRCode.deleteMany({ where: { tableId: existing.id } });
        await this.prisma.table.delete({ where: { id: existing.id } });
      }
    }

    // 4. Create Table
    const table = await this.prisma.table.create({
      data: {
        restaurantId,
        branchId: dto.branchId,
        tableName: dto.tableName,
        tableNumber: dto.tableNumber,
        seatingCapacity: dto.seatingCapacity ?? 4,
        notes: dto.notes ?? null,
        status: "AVAILABLE",
        isActive: true,
      },
    });

    // 5. Generate QR Code
    const qr = await this.qrService.generate(restaurantId, dto.branchId, table.id);

    // 6. Connect QR ID back to table
    return this.prisma.table.update({
      where: { id: table.id },
      data: { qrCodeId: qr.id },
      include: { qrCode: true, branch: true },
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateTableDto, isWaiter: boolean): Promise<Table> {
    const table = await this.prisma.table.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    let updateData: any = {};
    if (isWaiter) {
      // Waiter can only update dining status
      if (dto.status) updateData.status = dto.status;
    } else {
      updateData = { ...dto };
    }

    const updated = await this.prisma.table.update({
      where: { id },
      data: updateData,
      include: { qrCode: true, branch: true },
    });

    // Sync QR active state if table active state changed
    if (dto.isActive !== undefined && updated.qrCodeId) {
      await this.prisma.qRCode.updateMany({
        where: { tableId: id },
        data: { isActive: dto.isActive },
      });
    }

    return updated;
  }

  async remove(restaurantId: string, id: string): Promise<Table> {
    const table = await this.prisma.table.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    // Deactivate associated QR code
    await this.prisma.qRCode.updateMany({
      where: { tableId: id },
      data: { isActive: false },
    });

    // Soft delete table
    return this.prisma.table.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
