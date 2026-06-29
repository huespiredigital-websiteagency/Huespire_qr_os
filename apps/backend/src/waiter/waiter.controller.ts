import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { WaiterService } from "./waiter.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("waiter")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("waiter")
export class WaiterController {
  constructor(private readonly waiterService: WaiterService) {}

  @Get("orders")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER")
  @ApiOperation({ summary: "Get orders organized for waiter service (Ready, Serving, Served)" })
  async getWaiterOrders(
    @CurrentUser() user: any,
    @Query("branchId") branchId?: string
  ) {
    const data = await this.waiterService.getWaiterOrders(user.restaurantId, branchId);
    return {
      success: true,
      message: "Waiter orders retrieved successfully",
      data
    };
  }

  @Patch("orders/:id/pickup")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER")
  @ApiOperation({ summary: "Record waiter order pickup from kitchen" })
  async pickupOrder(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const data = await this.waiterService.pickupOrder(user, id);
    return data;
  }

  @Patch("orders/:id/serve")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER")
  @ApiOperation({ summary: "Mark order served to table" })
  async markServed(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const data = await this.waiterService.markServed(user, id);
    return data;
  }

  @Get("orders/history")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER")
  @ApiOperation({ summary: "Get served order history log" })
  async getOrderHistory(
    @CurrentUser() user: any,
    @Query("limit") limit?: number
  ) {
    const data = await this.waiterService.getOrderHistory(user.restaurantId, limit);
    return {
      success: true,
      message: "Order history retrieved successfully",
      data
    };
  }
}
