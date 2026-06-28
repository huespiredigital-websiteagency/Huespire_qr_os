import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  async findAll(restaurantId: string, categoryId?: string) {
    const whereClause: any = { restaurantId, deletedAt: null };
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    return this.prisma.menuItem.findMany({
      where: whereClause,
      orderBy: { displayOrder: "asc" },
      include: {
        category: { select: { id: true, name: true } },
        variants: { where: { isAvailable: true }, orderBy: { displayOrder: 'asc' } },
        images: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
      }
    });
  }

  async findOne(restaurantId: string, id: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        category: true,
        variants: { orderBy: { displayOrder: 'asc' } },
        images: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
      }
    });

    if (!item) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return item;
  }

  async create(restaurantId: string, dto: CreateMenuItemDto) {
    // Verify category exists in this restaurant
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, restaurantId, deletedAt: null }
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
    }

    // Check SKU uniqueness if provided
    if (dto.sku) {
      const existing = await this.prisma.menuItem.findFirst({
        where: { restaurantId, sku: dto.sku, deletedAt: null }
      });
      if (existing) {
        throw new ConflictException(`SKU '${dto.sku}' is already in use`);
      }
    }

    const slug = this.generateSlug(dto.name);
    
    // Auto-assign displayOrder
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const lastItem = await this.prisma.menuItem.findFirst({
        where: { restaurantId, categoryId: dto.categoryId, deletedAt: null },
        orderBy: { displayOrder: "desc" },
      });
      displayOrder = lastItem ? lastItem.displayOrder + 1 : 1;
    }

    return this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        sku: dto.sku,
        price: dto.price,
        taxPercentage: dto.taxPercentage ?? 0,
        preparationTime: dto.preparationTime ?? 15,
        calories: dto.calories,
        isVeg: dto.isVeg ?? false,
        isVegan: dto.isVegan ?? false,
        isSpicy: dto.isSpicy ?? false,
        isAvailable: dto.isAvailable ?? true,
        displayOrder,
      },
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateMenuItemDto) {
    const item = await this.findOne(restaurantId, id);

    if (dto.categoryId && dto.categoryId !== item.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, restaurantId, deletedAt: null }
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
      }
    }

    if (dto.sku && dto.sku !== item.sku) {
      const existing = await this.prisma.menuItem.findFirst({
        where: { restaurantId, sku: dto.sku, id: { not: id }, deletedAt: null }
      });
      if (existing) {
        throw new ConflictException(`SKU '${dto.sku}' is already in use`);
      }
    }

    const slug = dto.name ? this.generateSlug(dto.name) : undefined;

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...dto,
        ...(slug && { slug })
      },
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { deletedAt: new Date(), isAvailable: false },
    });
  }
}
