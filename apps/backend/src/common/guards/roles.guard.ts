import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException("Access Denied: Missing role information");
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException("Access Denied: Insufficient permissions");
    }

    // Restrict SUPER_ADMIN endpoints to official administrator subdomains
    if (requiredRoles.includes("SUPER_ADMIN")) {
      const request = context.switchToHttp().getRequest();
      const xTenantDomain = request.headers["x-tenant-domain"];
      const hostHeader = request.headers.host || "";
      
      let host = "";
      if (xTenantDomain) {
        host = typeof xTenantDomain === "string" ? xTenantDomain : xTenantDomain[0];
      } else {
        host = hostHeader;
      }
      
      if (host) {
        host = host.split(":")[0].toLowerCase();
      }
      
      const allowedAdminDomains = [
        "admin.huespire.digital",
        "admin.testing.huespire.digital",
        "testing.huespire.digital",
        "api-testing.huespire.digital",
        "api.huespire.digital",
        "admin.localhost",
        "localhost",
        "127.0.0.1"
      ];
      
      const isAllowed = allowedAdminDomains.includes(host) || host.endsWith(".nip.io");
      if (!isAllowed) {
        throw new ForbiddenException("Platform administration is restricted to the official admin gateway.");
      }
    }

    return true;
  }
}
