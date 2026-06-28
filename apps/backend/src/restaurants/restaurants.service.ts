import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateRestaurantDto } from "./dto/update-restaurant.dto";

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurant(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { settings: true, subscription: { include: { plan: true } } },
    });

    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }

    return restaurant;
  }

  async updateRestaurant(id: string, dto: UpdateRestaurantDto) {
    const { timezone, currency, taxPercentage, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Check if restaurant exists first
      const existing = await tx.restaurant.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException("Restaurant not found");
      }

      await tx.restaurant.update({
        where: { id },
        data: {
          ...rest,
          ...(timezone && { timezone }),
          ...(currency && { currency }),
          ...(taxPercentage !== undefined && { taxPercentage }),
        },
      });

      if (timezone || currency || taxPercentage !== undefined) {
        await tx.restaurantSettings.upsert({
          where: { restaurantId: id },
          create: {
            restaurantId: id,
            timezone: timezone || "Asia/Kolkata",
            currency: currency || "INR",
            taxPercentage: taxPercentage || 0,
          },
          update: {
            ...(timezone && { timezone }),
            ...(currency && { currency }),
            ...(taxPercentage !== undefined && { taxPercentage }),
          },
        });
      }

      return tx.restaurant.findUnique({
        where: { id },
        include: { settings: true },
      });
    });
  }
}
