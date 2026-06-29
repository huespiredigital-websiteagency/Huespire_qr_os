import { Controller, Get, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { KitchenService } from "./kitchen.service";
import { FilterKitchenOrdersDto } from "./dto/filter-kitchen-orders.dto";
import { RejectOrderDto } from "./dto/reject-order.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("kitchen")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("kitchen")
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get("orders")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "KITCHEN")
  @ApiOperation({ summary: "Get active kitchen orders grouped into Kanban columns with metrics" })
  async getKitchenOrders(
    @CurrentUser() user: any,
    @Query() query: FilterKitchenOrdersDto
  ) {
    const data = await this.kitchenService.getKitchenOrders(user.restaurantId, query);
    return {
      success: true,
      message: "Kitchen orders retrieved successfully",
      data
    };
  }

  @Get("orders/:id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "KITCHEN")
  @ApiOperation({ summary: "Get detailed kitchen order breakdown" })
  async getOrderDetails(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const data = await this.kitchenService.getOrderDetails(user.restaurantId, id);
    return {
      success: true,
      message: "Order details retrieved successfully",
      data
    };
  }

  @Patch("orders/:id/accept")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "KITCHEN")
  @ApiOperation({ summary: "Accept new incoming order in kitchen" })
  async acceptOrder(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const data = await this.kitchenService.acceptOrder(user, id);
    return data;
  }

  @Patch("orders/:id/prepare")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "KITCHEN")
  @ApiOperation({ summary: "Start preparing an order in kitchen" })
  async startPreparing(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const data = await this.kitchenService.startPreparing(user, id);
    return data;
  }

  @Patch("orders/:id/ready")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "KITCHEN")
  @ApiOperation({ summary: "Mark order ready for waiter pickup" })
  async markReady(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const data = await this.kitchenService.markReady(user, id);
    return data;
  }

  @Patch("orders/:id/reject")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "KITCHEN")
  @ApiOperation({ summary: "Reject/cancel an order with reason" })
  async rejectOrder(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectOrderDto
  ) {
    const data = await this.kitchenService.rejectOrder(user, id, dto);
    return data;
  }
}
