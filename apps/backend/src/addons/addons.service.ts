import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAddonDto } from "./dto/create-addon.dto";
import { UpdateAddonDto } from "./dto/update-addon.dto";

@Injectable()
export class AddonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.addon.findMany({
      where: { restaurantId },
      orderBy: { displayOrder: "asc" },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const addon = await this.prisma.addon.findFirst({
      where: { id, restaurantId },
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

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const lastAddon = await this.prisma.addon.findFirst({
        where: { restaurantId },
        orderBy: { displayOrder: "desc" },
      });
      displayOrder = lastAddon ? lastAddon.displayOrder + 1 : 1;
    }

    return this.prisma.addon.create({
      data: {
        restaurantId,
        name: dto.name,
        description: dto.description,
        additionalPrice: dto.additionalPrice,
        isActive: dto.isActive ?? true,
        displayOrder,
      },
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

    return this.prisma.addon.update({
      where: { id },
      data: dto,
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    // Hard delete
    return this.prisma.addon.delete({
      where: { id },
    });
  }
}
