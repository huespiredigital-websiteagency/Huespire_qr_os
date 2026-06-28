import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, ParseUUIDPipe } from "@nestjs/common";
import { MenuItemsService } from "./menu-items.service";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

@ApiTags("menu-items")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("menu-items")
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get all menu items of the restaurant" })
  @ApiQuery({ name: "categoryId", required: false, description: "Filter items by Category ID" })
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
    @Query("categoryId") categoryId?: string,
  ) {
    return this.menuItemsService.findAll(user.restaurantId, paginationDto, categoryId);
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get details of a single menu item" })
  async findOne(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const item = await this.menuItemsService.findOne(user.restaurantId, id);
    return {
      success: true,
      message: "Menu item details retrieved successfully",
      data: item,
    };
  }

  @Post()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Create a new menu item" })
  async create(@CurrentUser() user: any, @Body() dto: CreateMenuItemDto) {
    const item = await this.menuItemsService.create(user.restaurantId, dto);
    return {
      success: true,
      message: "Menu item created successfully",
      data: item,
    };
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Update menu item details" })
  async update(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    const item = await this.menuItemsService.update(user.restaurantId, id, dto);
    return {
      success: true,
      message: "Menu item updated successfully",
      data: item,
    };
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Soft delete a menu item" })
  async remove(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const item = await this.menuItemsService.remove(user.restaurantId, id);
    return {
      success: true,
      message: "Menu item deleted successfully",
      data: item,
    };
  }
}
