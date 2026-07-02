import { Injectable, NestMiddleware, NotFoundException, BadRequestException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const hostHeader = req.headers.host || "";
    // Remove port if present (e.g., localhost:5000 -> localhost)
    const host = hostHeader.split(":")[0].toLowerCase();

    // Skip tenant resolution for platform/global paths or health checks if needed
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "huespire.com" ||
      host === "huespire.digital" ||
      host === "testing.huespire.digital" ||
      host === "api-testing.huespire.digital" ||
      host === "api.huespire.digital" ||
      host === "app.restaurantos.com" ||
      host.endsWith(".nip.io")
    ) {
      // Platform operations - might be Super Admin or general requests
      return next();
    }

    let subdomain = "";
    let customDomain = "";

    // Base domain to check (e.g., huespire.com, huespire.digital, or localhost)
    // We allow subdomains on these base hosts
    if (host.endsWith(".localhost")) {
      subdomain = host.replace(".localhost", "");
    } else if (host.endsWith(".huespire.com")) {
      subdomain = host.replace(".huespire.com", "");
    } else if (host.endsWith(".testing.huespire.digital")) {
      subdomain = host.replace(".testing.huespire.digital", "");
    } else if (host.endsWith(".huespire.digital")) {
      subdomain = host.replace(".huespire.digital", "");
    } else {
      customDomain = host;
    }

    let restaurant = null;

    if (subdomain) {
      restaurant = await this.prisma.restaurant.findUnique({
        where: { subdomain },
        include: { settings: true }
      });
    } else if (customDomain) {
      restaurant = await this.prisma.restaurant.findUnique({
        where: { customDomain },
        include: { settings: true }
      });
    }

    if (!restaurant) {
      // If we couldn't resolve a restaurant, check if this is a path that requires one.
      // In a strict tenant API, we block requests that attempt to access custom/subdomains
      // which do not match any tenant in our system.
      throw new NotFoundException(`Restaurant not found for host: ${host}`);
    }

    if (!restaurant.isActive) {
      throw new BadRequestException("Restaurant access is currently unavailable.");
    }

    // Attach to request
    req["restaurant"] = restaurant;
    req["restaurantId"] = restaurant.id;

    next();
  }
}
