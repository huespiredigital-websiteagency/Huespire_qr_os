import { Controller, Get, Patch, Body, UseGuards, Query, ForbiddenException, BadRequestException } from "@nestjs/common";
import { RestaurantsService } from "./restaurants.service";
import { UpdateRestaurantDto } from "./dto/update-restaurant.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

@ApiTags("restaurants")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("restaurants")
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get("me")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER", "KITCHEN")
  @ApiOperation({ summary: "Retrieve current restaurant context settings" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID to retrieve (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Restaurant settings retrieved successfully" })
  async getRestaurantMe(@CurrentUser() user: any, @Query("restaurantId") restaurantId?: string) {
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

    const restaurant = await this.restaurantsService.getRestaurant(targetRestaurantId);
    return {
      success: true,
      message: "Restaurant context settings retrieved successfully",
      data: restaurant,
    };
  }

  @Patch("me")
  @Roles("SUPER_ADMIN", "OWNER")
  @ApiOperation({ summary: "Update current restaurant configurations (Owner only)" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID to update (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Restaurant configurations updated successfully" })
  async updateRestaurantMe(
    @CurrentUser() user: any,
    @Body() body: UpdateRestaurantDto,
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

    const restaurant = await this.restaurantsService.updateRestaurant(targetRestaurantId, body);
    return {
      success: true,
      message: "Restaurant configurations updated successfully",
      data: restaurant,
    };
  }
}
