import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Generate a simple slug from name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  async findAll(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { menuItems: { where: { deletedAt: null } } }
        }
      }
    });
  }

  async findOne(restaurantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: {
        menuItems: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
          include: { images: true, variants: true, category: true }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(restaurantId: string, dto: CreateCategoryDto) {
    // Check for duplicate name
    const existing = await this.prisma.category.findFirst({
      where: { restaurantId, name: { equals: dto.name, mode: "insensitive" }, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(`Category with name '${dto.name}' already exists`);
    }

    const slug = this.generateSlug(dto.name);
    
    // Auto-assign displayOrder if not provided
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const lastCategory = await this.prisma.category.findFirst({
        where: { restaurantId, deletedAt: null },
        orderBy: { displayOrder: "desc" },
      });
      displayOrder = lastCategory ? lastCategory.displayOrder + 1 : 1;
    }

    return this.prisma.category.create({
      data: {
        restaurantId,
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        displayOrder,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(restaurantId, id);

    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.category.findFirst({
        where: { 
          restaurantId, 
          name: { equals: dto.name, mode: "insensitive" },
          id: { not: id },
          deletedAt: null
        },
      });

      if (existing) {
        throw new ConflictException(`Category with name '${dto.name}' already exists`);
      }
    }

    const slug = dto.name ? this.generateSlug(dto.name) : undefined;

    return this.prisma.category.update({
      where: { id },
      data: {
        ...dto,
        ...(slug && { slug })
      },
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);

    // Soft delete
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
