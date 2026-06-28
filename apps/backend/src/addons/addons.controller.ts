import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { AddonsService } from "./addons.service";
import { CreateAddonDto } from "./dto/create-addon.dto";
import { UpdateAddonDto } from "./dto/update-addon.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("addons")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("addons")
export class AddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get all add-ons for the restaurant" })
  async findAll(@CurrentUser() user: any) {
    const addons = await this.addonsService.findAll(user.restaurantId);
    return {
      success: true,
      message: "Add-ons retrieved successfully",
      data: addons,
    };
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get details of a single add-on" })
  async findOne(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const addon = await this.addonsService.findOne(user.restaurantId, id);
    return {
      success: true,
      message: "Add-on details retrieved successfully",
      data: addon,
    };
  }

  @Post()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Create a new add-on" })
  async create(@CurrentUser() user: any, @Body() dto: CreateAddonDto) {
    const addon = await this.addonsService.create(user.restaurantId, dto);
    return {
      success: true,
      message: "Add-on created successfully",
      data: addon,
    };
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Update add-on details" })
  async update(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddonDto,
  ) {
    const addon = await this.addonsService.update(user.restaurantId, id, dto);
    return {
      success: true,
      message: "Add-on updated successfully",
      data: addon,
    };
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Delete an add-on" })
  async remove(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const addon = await this.addonsService.remove(user.restaurantId, id);
    return {
      success: true,
      message: "Add-on deleted successfully",
      data: addon,
    };
  }
}
