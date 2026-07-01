import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { QRService } from "../qr/qr.service";
import { CreateTableDto } from "./dto/create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";
import { Table } from "@prisma/client";

import { PaginationDto, PaginatedResult } from "../common/dto/pagination.dto";

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly qrService: QRService,
  ) {}

  async findAll(restaurantId: string, paginationDto?: PaginationDto): Promise<PaginatedResult<Table>> {
    const page = Number(paginationDto?.page) || 1;
    const limit = Number(paginationDto?.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = paginationDto?.sortBy || "tableNumber";
    const sortOrder = (paginationDto?.sortOrder || "asc").toLowerCase() as "asc" | "desc";

    const where = {
      restaurantId,
      deletedAt: null,
    };

    const [total, data] = await Promise.all([
      this.prisma.table.count({ where }),
      this.prisma.table.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          qrCode: true,
        }
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

  async findOne(restaurantId: string, id: string): Promise<Table> {
    const table = await this.prisma.table.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: { qrCode: true },
    });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    return table;
  }

  async create(restaurantId: string, dto: CreateTableDto): Promise<Table> {
    // 1. Validate subscription table limit
    const quota = await this.subscriptionsService.hasQuota(restaurantId, "tables");
    if (!quota.allowed) {
      throw new ForbiddenException(`Table limit reached (${quota.max}). Please upgrade your subscription plan.`);
    }

    // 2. Check table number uniqueness in the restaurant
    const existing = await this.prisma.table.findFirst({
      where: {
        restaurantId,
        tableNumber: dto.tableNumber,
      },
      include: {
        qrCode: true,
      },
    });

    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException("A table with this number already exists.");
      } else {
        // Table exists but is soft-deleted. Restore and update it instead of deleting it to avoid FK constraint violations
        if (existing.qrCode) {
          await this.prisma.qRCode.update({
            where: { id: existing.qrCode.id },
            data: { isActive: true },
          });
        } else {
          const qr = await this.qrService.generate(restaurantId, existing.id);
          await this.prisma.table.update({
            where: { id: existing.id },
            data: { qrCodeId: qr.id },
          });
        }

        return this.prisma.table.update({
          where: { id: existing.id },
          data: {
            tableName: dto.tableName,
            seatingCapacity: dto.seatingCapacity ?? 4,
            notes: dto.notes ?? null,
            status: "AVAILABLE",
            isActive: true,
            deletedAt: null,
          },
          include: { qrCode: true },
        });
      }
    }

    // 3. Create Table
    const table = await this.prisma.table.create({
      data: {
        restaurantId,
        tableName: dto.tableName,
        tableNumber: dto.tableNumber,
        seatingCapacity: dto.seatingCapacity ?? 4,
        notes: dto.notes ?? null,
        status: "AVAILABLE",
        isActive: true,
      },
    });

    // 4. Generate QR Code
    const qr = await this.qrService.generate(restaurantId, table.id);

    // 5. Connect QR ID back to table
    return this.prisma.table.update({
      where: { id: table.id },
      data: { qrCodeId: qr.id },
      include: { qrCode: true },
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
      include: { qrCode: true },
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
