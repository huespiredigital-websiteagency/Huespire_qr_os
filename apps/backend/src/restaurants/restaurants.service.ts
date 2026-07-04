import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
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
    const {
      timezone,
      currency,
      taxPercentage,
      domain,
      primaryColor,
      secondaryColor,
      businessEmail,
      businessPhone,
      businessRegistrationNumber,
      gstVatNumber,
      language,
      businessHours,
      invoicePrefix,
      invoiceFooter,
      emailFooter,
      website,
      socialLinks,
      enableEmailReceipts,
      enableOnlineOrdering,
      enableTableOrdering,
      enableTakeaway,
      enableDelivery,
      ...rest
    } = dto;
    const cleanDomain = domain ? domain.toLowerCase().trim() : undefined;

    return this.prisma.$transaction(async (tx) => {
      // Check if restaurant exists first
      const existing = await tx.restaurant.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException("Restaurant not found");
      }

      // Validate domain uniqueness if domain is being updated
      if (cleanDomain) {
        const domainOwner = await tx.restaurant.findUnique({
          where: { domain: cleanDomain }
        });
        if (domainOwner && domainOwner.id !== id) {
          throw new BadRequestException("This domain is already registered to another restaurant.");
        }
      }

      await tx.restaurant.update({
        where: { id },
        data: {
          ...rest,
          ...(cleanDomain !== undefined && { domain: cleanDomain }),
          ...(timezone && { timezone }),
          ...(currency && { currency }),
          ...(taxPercentage !== undefined && { taxPercentage }),
        },
      });

      const settingsData = {
        ...(timezone && { timezone }),
        ...(currency && { currency }),
        ...(taxPercentage !== undefined && { taxPercentage }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(businessEmail !== undefined && { businessEmail }),
        ...(businessPhone !== undefined && { businessPhone }),
        ...(businessRegistrationNumber !== undefined && { businessRegistrationNumber }),
        ...(gstVatNumber !== undefined && { gstVatNumber }),
        ...(language && { language }),
        ...(businessHours !== undefined && { businessHours }),
        ...(invoicePrefix && { invoicePrefix }),
        ...(invoiceFooter !== undefined && { invoiceFooter }),
        ...(emailFooter !== undefined && { emailFooter }),
        ...(website !== undefined && { website }),
        ...(socialLinks !== undefined && { socialLinks }),
        ...(enableEmailReceipts !== undefined && { enableEmailReceipts }),
        ...(enableOnlineOrdering !== undefined && { enableOnlineOrdering }),
        ...(enableTableOrdering !== undefined && { enableTableOrdering }),
        ...(enableTakeaway !== undefined && { enableTakeaway }),
        ...(enableDelivery !== undefined && { enableDelivery }),
      };

      await tx.restaurantSettings.upsert({
        where: { restaurantId: id },
        create: {
          restaurantId: id,
          timezone: timezone || "Asia/Kolkata",
          currency: currency || "INR",
          taxPercentage: taxPercentage || 0,
          ...settingsData,
        },
        update: settingsData,
      });

      return tx.restaurant.findUnique({
        where: { id },
        include: { settings: true },
      });
    });
  }
}
