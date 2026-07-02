import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QRCode } from "@prisma/client";
import * as crypto from "crypto";
import * as QRCodeLib from "qrcode";

@Injectable()
export class QRService {
  constructor(private readonly prisma: PrismaService) {}

  private getRedirectionUrl(restaurant: any, token: string): string {
    // 1. Prioritize custom domain if set
    if (restaurant.domain) {
      return `https://${restaurant.domain}/menu/${token}`;
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const isLocal = appUrl.includes("localhost") || appUrl.includes("127.0.0.1") || appUrl.includes("nip.io");

    if (isLocal) {
      const baseHost = appUrl.replace(/^https?:\/\//, "");
      if (baseHost.includes("localhost")) {
        return `http://${restaurant.subdomain}.localhost:3000/menu/${token}`;
      }
      return `http://${baseHost}/menu/${token}`;
    }

    const domain = `${restaurant.subdomain}.huespire.digital`;
    return `https://${domain}/menu/${token}`;
  }

  async generate(restaurantId: string, tableId: string): Promise<QRCode> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }

    const token = crypto.randomBytes(16).toString("hex");
    const qrUrl = this.getRedirectionUrl(restaurant, token);

    return this.prisma.qRCode.create({
      data: {
        restaurantId,
        tableId,
        qrToken: token,
        qrPath: `/qr/${token}.png`,
        qrUrl,
        isActive: true,
      },
    });
  }

  async regenerate(restaurantId: string, tableId: string): Promise<QRCode> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }

    // Verify the QR record belongs to the caller's restaurant
    const existing = await this.prisma.qRCode.findFirst({
      where: { tableId, restaurantId },
    });

    if (!existing) {
      throw new NotFoundException("QR Code not found for this table");
    }

    const token = crypto.randomBytes(16).toString("hex");
    const qrUrl = this.getRedirectionUrl(restaurant, token);

    return this.prisma.qRCode.update({
      where: { id: existing.id },
      data: {
        qrToken: token,
        qrUrl,
        qrPath: `/qr/${token}.png`,
        isActive: true,
        scanCount: 0,
        lastScannedAt: null,
      },
    });
  }

  async validate(token: string): Promise<any> {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { qrToken: token },
      include: {
        table: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    if (!qrCode || !qrCode.isActive) {
      throw new NotFoundException("QR Not Found");
    }

    const table = qrCode.table;
    if (!table || !table.isActive || table.deletedAt) {
      throw new BadRequestException("Table Unavailable");
    }

    const restaurant = table.restaurant;
    if (!restaurant || !restaurant.isActive || restaurant.deletedAt) {
      throw new BadRequestException("Table Unavailable (Restaurant Inactive)");
    }

    // Increment scan metrics
    await this.prisma.qRCode.update({
      where: { id: qrCode.id },
      data: {
        scanCount: qrCode.scanCount + 1,
        lastScannedAt: new Date(),
      },
    });

    return {
      qrToken: qrCode.qrToken,
      qrUrl: qrCode.qrUrl,
      tableId: table.id,
      tableName: table.tableName,
      tableNumber: table.tableNumber,
      seatingCapacity: table.seatingCapacity,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      subdomain: restaurant.subdomain,
      currency: restaurant.currency,
    };
  }

  async getQrImage(token: string, format: "png" | "svg"): Promise<any> {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { qrToken: token },
      include: {
        table: {
          include: { restaurant: true }
        }
      }
    });

    if (!qrCode) {
      throw new NotFoundException("QR Code not found");
    }

    const restaurant = qrCode.table?.restaurant;
    let redirectUrl = qrCode.qrUrl;
    
    if (restaurant) {
      redirectUrl = this.getRedirectionUrl(restaurant, token);
    }

    if (format === "svg") {
      return QRCodeLib.toString(redirectUrl, { type: "svg" });
    } else {
      return QRCodeLib.toBuffer(redirectUrl);
    }
  }

  async findAll(restaurantId: string): Promise<QRCode[]> {
    return this.prisma.qRCode.findMany({
      where: { restaurantId },
      include: {
        table: true,
      },
    });
  }

  async getTestQrBase64(token: string, host: string): Promise<{
    base64: string;
    tableName: string;
    tableNumber: number;
    restaurantName: string;
    scanUrl: string;
  }> {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { qrToken: token },
      include: {
        table: {
          include: { restaurant: true },
        },
      },
    });

    if (!qrCode || !qrCode.isActive) {
      throw new NotFoundException("QR Code not found");
    }

    const table = qrCode.table;
    const restaurant = table?.restaurant;

    const scanUrl = `http://${host}/qr/scan/${token}`;
    const buffer = await (QRCodeLib as any).toBuffer(scanUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return {
      base64: buffer.toString("base64"),
      tableName: table?.tableName || "Unknown",
      tableNumber: table?.tableNumber || 0,
      restaurantName: restaurant?.name || "Unknown",
      scanUrl,
    };
  }

  async findOneByTable(restaurantId: string, tableId: string): Promise<QRCode> {
    const qr = await this.prisma.qRCode.findFirst({
      where: { tableId, restaurantId },
    });

    if (!qr) {
      throw new NotFoundException("QR Code not found for this table");
    }

    return qr;
  }

  async remove(restaurantId: string, id: string): Promise<QRCode> {
    const qr = await this.prisma.qRCode.findFirst({
      where: { id, restaurantId },
    });

    if (!qr) {
      throw new NotFoundException("QR Code not found");
    }

    // Nullify the stale reference on the table before hard-deleting the QR record
    await this.prisma.table.updateMany({
      where: { qrCodeId: id },
      data: { qrCodeId: null },
    });

    return this.prisma.qRCode.delete({
      where: { id },
    });
  }
}
