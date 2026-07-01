import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, ParseUUIDPipe } from "@nestjs/common";
import { TablesService } from "./tables.service";
import { CreateTableDto } from "./dto/create-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

@ApiTags("tables")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tables")
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get all tables of the restaurant" })
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
  ) {
    const paginated = await this.tablesService.findAll(user.restaurantId, paginationDto);
    return {
      success: true,
      message: "Tables retrieved successfully",
      data: paginated.data,
      meta: paginated.meta,
    };
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get details of a single table by id" })
  async findOne(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const table = await this.tablesService.findOne(user.restaurantId, id);
    return {
      success: true,
      message: "Table details retrieved successfully",
      data: table,
    };
  }

  @Post()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Create a new dining table" })
  async create(@CurrentUser() user: any, @Body() dto: CreateTableDto) {
    const table = await this.tablesService.create(user.restaurantId, dto);
    return {
      success: true,
      message: "Table created successfully",
      data: table,
    };
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER")
  @ApiOperation({ summary: "Update table configurations or dining status" })
  async update(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableDto,
  ) {
    const isWaiter = user.role === "WAITER";
    const table = await this.tablesService.update(user.restaurantId, id, dto, isWaiter);
    return {
      success: true,
      message: "Table updated successfully",
      data: table,
    };
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Soft delete a table" })
  async remove(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const table = await this.tablesService.remove(user.restaurantId, id);
    return {
      success: true,
      message: "Table deleted successfully",
      data: table,
    };
  }
}
