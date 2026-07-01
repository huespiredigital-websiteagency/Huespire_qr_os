import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class MenuImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadImage(
    restaurantId: string, 
    menuItemId: string, 
    file: Express.Multer.File, 
    isPrimary: boolean = false
  ) {
    // Verify menu item belongs to this restaurant
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId, deletedAt: null }
    });

    if (!menuItem) {
      // Clean up uploaded file if item not found
      fs.unlinkSync(file.path);
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }

    // Limit to exactly 1 photo per menu item by deleting any existing ones first
    const existingImage = await this.prisma.menuImage.findFirst({
      where: { menuItemId, restaurantId }
    });

    if (existingImage) {
      if (fs.existsSync(existingImage.imagePath)) {
        fs.unlinkSync(existingImage.imagePath);
      }
      await this.prisma.menuImage.delete({
        where: { id: existingImage.id }
      });
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const imageUrl = `${backendUrl}/uploads/${file.filename}`;

    return this.prisma.menuImage.create({
      data: {
        restaurantId,
        menuItemId,
        imageName: file.originalname,
        imagePath: file.path,
        imageUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
        isPrimary,
      }
    });
  }

  async removeImage(restaurantId: string, imageId: string) {
    const image = await this.prisma.menuImage.findFirst({
      where: { id: imageId, restaurantId }
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    // Remove from DB
    await this.prisma.menuImage.delete({
      where: { id: imageId }
    });

    // Remove from filesystem
    if (fs.existsSync(image.imagePath)) {
      fs.unlinkSync(image.imagePath);
    }

    return { deleted: true };
  }
}
