import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAddonDto } from "./dto/create-addon.dto";
import { UpdateAddonDto } from "./dto/update-addon.dto";

@Injectable()
export class AddonsService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateTenantReferences(restaurantId: string, categoryIds?: string[], menuItemIds?: string[]) {
    if (categoryIds && categoryIds.length > 0) {
      const validCategories = await this.prisma.category.findMany({
        where: { id: { in: categoryIds }, restaurantId, deletedAt: null },
        select: { id: true }
      });
      if (validCategories.length !== categoryIds.length) {
        throw new BadRequestException("One or more category references are invalid or belong to another tenant");
      }
    }

    if (menuItemIds && menuItemIds.length > 0) {
      const validMenuItems = await this.prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, restaurantId, deletedAt: null },
        select: { id: true }
      });
      if (validMenuItems.length !== menuItemIds.length) {
        throw new BadRequestException("One or more menu item references are invalid or belong to another tenant");
      }
    }
  }

  async findAll(restaurantId: string) {
    return this.prisma.addon.findMany({
      where: { restaurantId },
      orderBy: { displayOrder: "asc" },
      include: {
        categoryAddons: {
          select: { categoryId: true }
        },
        menuItemAddons: {
          select: { menuItemId: true }
        }
      }
    });
  }

  async findOne(restaurantId: string, id: string) {
    const addon = await this.prisma.addon.findFirst({
      where: { id, restaurantId },
      include: {
        categoryAddons: {
          select: { categoryId: true }
        },
        menuItemAddons: {
          select: { menuItemId: true }
        }
      }
    });

    if (!addon) {
      throw new NotFoundException(`Add-on with ID ${id} not found`);
    }

    return addon;
  }

  async create(restaurantId: string, dto: CreateAddonDto) {
    const existing = await this.prisma.addon.findFirst({
      where: { 
        restaurantId, 
        name: { equals: dto.name, mode: "insensitive" } 
      }
    });

    if (existing) {
      throw new ConflictException(`Add-on '${dto.name}' already exists in this restaurant`);
    }

    await this.validateTenantReferences(restaurantId, dto.categoryIds, dto.menuItemIds);

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const lastAddon = await this.prisma.addon.findFirst({
        where: { restaurantId },
        orderBy: { displayOrder: "desc" },
      });
      displayOrder = lastAddon ? lastAddon.displayOrder + 1 : 1;
    }

    const { categoryIds, menuItemIds, ...addonData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const addon = await tx.addon.create({
        data: {
          restaurantId,
          name: addonData.name,
          description: addonData.description,
          additionalPrice: addonData.additionalPrice,
          isActive: addonData.isActive ?? true,
          displayOrder,
        },
      });

      if (categoryIds && categoryIds.length > 0) {
        await tx.categoryAddon.createMany({
          data: categoryIds.map(categoryId => ({ categoryId, addonId: addon.id }))
        });
      }

      if (menuItemIds && menuItemIds.length > 0) {
        await tx.menuItemAddon.createMany({
          data: menuItemIds.map(menuItemId => ({ menuItemId, addonId: addon.id }))
        });
      }

      return tx.addon.findUnique({
        where: { id: addon.id },
        include: {
          categoryAddons: { select: { categoryId: true } },
          menuItemAddons: { select: { menuItemId: true } }
        }
      });
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateAddonDto) {
    const addon = await this.findOne(restaurantId, id);

    if (dto.name && dto.name !== addon.name) {
      const existing = await this.prisma.addon.findFirst({
        where: { 
          restaurantId, 
          name: { equals: dto.name, mode: "insensitive" },
          id: { not: id }
        }
      });
      if (existing) {
        throw new ConflictException(`Add-on '${dto.name}' already exists`);
      }
    }

    await this.validateTenantReferences(restaurantId, dto.categoryIds, dto.menuItemIds);

    const { categoryIds, menuItemIds, ...addonData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.addon.update({
        where: { id },
        data: addonData,
      });

      if (categoryIds !== undefined) {
        await tx.categoryAddon.deleteMany({ where: { addonId: id } });
        if (categoryIds.length > 0) {
          await tx.categoryAddon.createMany({
            data: categoryIds.map(categoryId => ({ categoryId, addonId: id }))
          });
        }
      }

      if (menuItemIds !== undefined) {
        await tx.menuItemAddon.deleteMany({ where: { addonId: id } });
        if (menuItemIds.length > 0) {
          await tx.menuItemAddon.createMany({
            data: menuItemIds.map(menuItemId => ({ menuItemId, addonId: id }))
          });
        }
      }

      return tx.addon.findUnique({
        where: { id },
        include: {
          categoryAddons: { select: { categoryId: true } },
          menuItemAddons: { select: { menuItemId: true } }
        }
      });
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    return this.prisma.addon.delete({
      where: { id },
    });
  }
}
