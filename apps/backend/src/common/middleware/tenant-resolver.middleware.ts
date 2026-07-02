import { Injectable, NestMiddleware, NotFoundException, BadRequestException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  private getHostname(urlString: string): string {
    try {
      if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
        urlString = "http://" + urlString;
      }
      const url = new URL(urlString);
      return url.hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    let host = "";

    // 1. Preferred: X-Tenant-Domain header sent from Axios Client
    const xTenantDomain = req.headers["x-tenant-domain"];
    if (xTenantDomain) {
      host = typeof xTenantDomain === "string" ? xTenantDomain : xTenantDomain[0];
    }

    // 2. Fallback: X-Forwarded-Host (from Nginx reverse proxy)
    if (!host) {
      const xForwardedHost = req.headers["x-forwarded-host"];
      if (xForwardedHost) {
        host = typeof xForwardedHost === "string" ? xForwardedHost : xForwardedHost[0];
      }
    }

    // 3. Fallback: Origin Header
    if (!host) {
      const origin = req.headers["origin"];
      if (origin) {
        host = this.getHostname(typeof origin === "string" ? origin : origin[0]);
      }
    }

    // 4. Fallback: Referer Header
    if (!host) {
      const referer = req.headers["referer"];
      if (referer) {
        host = this.getHostname(typeof referer === "string" ? referer : referer[0]);
      }
    }

    // 5. Fallback: Host Header (Only if not requesting the API domain directly)
    const apiDomains = [
      "api.huespire.digital",
      "api-testing.huespire.digital",
      "localhost:5000",
      "127.0.0.1:5000"
    ];
    const hostHeader = req.headers.host || "";
    if (!host && !apiDomains.some(apiDom => hostHeader.toLowerCase().includes(apiDom))) {
      host = hostHeader;
    }

    // Clean host by removing the port
    if (host) {
      host = host.split(":")[0].toLowerCase();
    }

    const platformDomains = [
      "localhost",
      "127.0.0.1",
      "huespire.com",
      "huespire.digital",
      "testing.huespire.digital",
      "api-testing.huespire.digital",
      "api.huespire.digital",
      "app.restaurantos.com"
    ];

    // Skip tenant resolution for platform/global paths or health checks
    if (!host || platformDomains.includes(host) || host.endsWith(".nip.io")) {
      return next();
    }

    let subdomain = "";
    let customDomain = "";

    // Base domain to check. Subdomains on these hosts map to tenant slug/subdomains.
    const baseDomains = [
      ".testing.huespire.digital",
      ".huespire.digital",
      ".huespire.com",
      ".localhost"
    ];

    const matchedBase = baseDomains.find(base => host.endsWith(base));

    if (matchedBase) {
      subdomain = host.slice(0, -matchedBase.length);
    } else {
      customDomain = host;
    }

    let restaurant = null;

    // 1. Primary Lookup: Try exact domain field match
    restaurant = await this.prisma.restaurant.findUnique({
      where: { domain: host },
      include: { settings: true }
    });

    // 2. Fallback Lookup: Try customDomain field match
    if (!restaurant) {
      restaurant = await this.prisma.restaurant.findUnique({
        where: { customDomain: host },
        include: { settings: true }
      });
    }

    // 3. Subdomain Fallback: Resolve using parsed subdomain parameter
    if (!restaurant && subdomain) {
      restaurant = await this.prisma.restaurant.findFirst({
        where: {
          OR: [
            { subdomain },
            { domain: { startsWith: `${subdomain}.` } }
          ]
        },
        include: { settings: true }
      });
    }

    // 4. Custom/Subdomain Fallback (Legacy)
    if (!restaurant && customDomain) {
      restaurant = await this.prisma.restaurant.findFirst({
        where: {
          OR: [
            { subdomain: customDomain },
            { customDomain: customDomain }
          ]
        },
        include: { settings: true }
      });
    }

    if (!restaurant) {
      throw new NotFoundException(`Restaurant not found for host: ${host}`);
    }

    if (!restaurant.isActive) {
      throw new BadRequestException("Restaurant access is currently unavailable.");
    }

    // Attach restaurant details to the request
    req["restaurant"] = restaurant;
    req["restaurantId"] = restaurant.id;

    next();
  }
}
