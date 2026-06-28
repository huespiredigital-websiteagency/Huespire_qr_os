import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, ParseUUIDPipe } from "@nestjs/common";
import { VariantsService } from "./variants.service";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { UpdateVariantDto } from "./dto/update-variant.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

@ApiTags("variants")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("variants")
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get all variants of the restaurant" })
  @ApiQuery({ name: "menuItemId", required: false, description: "Filter variants by Menu Item ID" })
  async findAll(@CurrentUser() user: any, @Query("menuItemId") menuItemId?: string) {
    const variants = await this.variantsService.findAll(user.restaurantId, menuItemId);
    return {
      success: true,
      message: "Variants retrieved successfully",
      data: variants,
    };
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get details of a single variant" })
  async findOne(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const variant = await this.variantsService.findOne(user.restaurantId, id);
    return {
      success: true,
      message: "Variant details retrieved successfully",
      data: variant,
    };
  }

  @Post()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Create a new variant" })
  async create(@CurrentUser() user: any, @Body() dto: CreateVariantDto) {
    const variant = await this.variantsService.create(user.restaurantId, dto);
    return {
      success: true,
      message: "Variant created successfully",
      data: variant,
    };
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Update variant details" })
  async update(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    const variant = await this.variantsService.update(user.restaurantId, id, dto);
    return {
      success: true,
      message: "Variant updated successfully",
      data: variant,
    };
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Delete a variant" })
  async remove(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const variant = await this.variantsService.remove(user.restaurantId, id);
    return {
      success: true,
      message: "Variant deleted successfully",
      data: variant,
    };
  }
}
