import { Controller, Get, Post, Body, UseGuards, Query, ForbiddenException, BadRequestException } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { UpgradeSubscriptionDto } from "./dto/upgrade-subscription.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

@ApiTags("subscriptions")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "Get all restaurant subscriptions (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Returns paginated subscriptions" })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.subscriptionsService.findAll(paginationDto);
  }

  @Get("me")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Get subscription details for the current restaurant" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Subscription details retrieved successfully" })
  async getSubscription(@CurrentUser() user: any, @Query("restaurantId") restaurantId?: string) {
    let targetRestaurantId = user.restaurantId;

    if (user.role === "SUPER_ADMIN") {
      if (!restaurantId) {
        throw new BadRequestException("restaurantId query parameter is required for Super Admin");
      }
      targetRestaurantId = restaurantId;
    } else {
      if (!targetRestaurantId) {
        throw new ForbiddenException("No restaurant associated with this user account");
      }
    }

    const subscription = await this.subscriptionsService.getSubscription(targetRestaurantId);
    return {
      success: true,
      message: "Subscription details retrieved successfully",
      data: subscription,
    };
  }

  @Post("upgrade")
  @Roles("SUPER_ADMIN", "OWNER")
  @ApiOperation({ summary: "Upgrade the restaurant subscription to a new plan" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID to upgrade (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Subscription upgraded successfully" })
  async upgradeSubscription(
    @CurrentUser() user: any,
    @Body() body: UpgradeSubscriptionDto,
    @Query("restaurantId") restaurantId?: string,
  ) {
    let targetRestaurantId = user.restaurantId;

    if (user.role === "SUPER_ADMIN") {
      if (!restaurantId) {
        throw new BadRequestException("restaurantId query parameter is required for Super Admin");
      }
      targetRestaurantId = restaurantId;
    } else {
      if (!targetRestaurantId) {
        throw new ForbiddenException("No restaurant associated with this user account");
      }
    }

    const subscription = await this.subscriptionsService.upgrade(targetRestaurantId, body.planId);
    return {
      success: true,
      message: "Subscription upgraded successfully",
      data: subscription,
    };
  }
}
