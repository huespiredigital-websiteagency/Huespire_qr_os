import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resolvedRestaurantId = request.restaurantId;

    if (!user) {
      throw new ForbiddenException("Tenant validation requires authentication");
    }

    // Super Admin has unrestricted access to all tenant data
    if (user.role === "SUPER_ADMIN") {
      return true;
    }

    // For other roles, their token restaurantId must match the resolved request tenantId
    if (resolvedRestaurantId && user.restaurantId !== resolvedRestaurantId) {
      throw new ForbiddenException("Access Denied: Tenant mismatch");
    }

    return true;
  }
}
