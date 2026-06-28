import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { UpdateVariantDto } from "./dto/update-variant.dto";

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(restaurantId: string, menuItemId?: string) {
    const whereClause: any = { restaurantId };
    if (menuItemId) {
      whereClause.menuItemId = menuItemId;
    }

    return this.prisma.variant.findMany({
      where: whereClause,
      orderBy: { displayOrder: "asc" },
      include: {
        menuItem: { select: { id: true, name: true } }
      }
    });
  }

  async findOne(restaurantId: string, id: string) {
    const variant = await this.prisma.variant.findFirst({
      where: { id, restaurantId },
      include: {
        menuItem: { select: { id: true, name: true } }
      }
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return variant;
  }

  async create(restaurantId: string, dto: CreateVariantDto) {
    // Verify menuItem exists in this restaurant
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: dto.menuItemId, restaurantId, deletedAt: null }
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${dto.menuItemId} not found`);
    }

    // Check for duplicate variant name within the same menu item
    const existing = await this.prisma.variant.findFirst({
      where: { 
        restaurantId, 
        menuItemId: dto.menuItemId, 
        name: { equals: dto.name, mode: "insensitive" } 
      }
    });

    if (existing) {
      throw new ConflictException(`Variant '${dto.name}' already exists for this menu item`);
    }

    // Auto-assign displayOrder
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const lastVariant = await this.prisma.variant.findFirst({
        where: { restaurantId, menuItemId: dto.menuItemId },
        orderBy: { displayOrder: "desc" },
      });
      displayOrder = lastVariant ? lastVariant.displayOrder + 1 : 1;
    }

    return this.prisma.variant.create({
      data: {
        restaurantId,
        menuItemId: dto.menuItemId,
        name: dto.name,
        price: dto.price,
        preparationTime: dto.preparationTime ?? 15,
        isAvailable: dto.isAvailable ?? true,
        displayOrder,
      },
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateVariantDto) {
    const variant = await this.findOne(restaurantId, id);

    if (dto.name && dto.name !== variant.name) {
      const existing = await this.prisma.variant.findFirst({
        where: { 
          restaurantId, 
          menuItemId: dto.menuItemId || variant.menuItemId, 
          name: { equals: dto.name, mode: "insensitive" },
          id: { not: id }
        }
      });
      if (existing) {
        throw new ConflictException(`Variant '${dto.name}' already exists for this menu item`);
      }
    }

    return this.prisma.variant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    // Hard delete for variants (or mark unavailable, but schema doesn't have deletedAt)
    return this.prisma.variant.delete({
      where: { id },
    });
  }
}
