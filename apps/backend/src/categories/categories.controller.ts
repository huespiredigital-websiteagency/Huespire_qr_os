import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, ParseUUIDPipe } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("categories")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get all categories of the restaurant" })
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
  ) {
    const paginated = await this.categoriesService.findAll(user.restaurantId, paginationDto);
    return {
      success: true,
      message: "Categories retrieved successfully",
      data: paginated.data,
      meta: paginated.meta,
    };
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER")
  @ApiOperation({ summary: "Get details of a single category by id" })
  async findOne(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const category = await this.categoriesService.findOne(user.restaurantId, id);
    return {
      success: true,
      message: "Category details retrieved successfully",
      data: category,
    };
  }

  @Post()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Create a new category" })
  async create(@CurrentUser() user: any, @Body() dto: CreateCategoryDto) {
    const category = await this.categoriesService.create(user.restaurantId, dto);
    return {
      success: true,
      message: "Category created successfully",
      data: category,
    };
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Update category details" })
  async update(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(user.restaurantId, id, dto);
    return {
      success: true,
      message: "Category updated successfully",
      data: category,
    };
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Soft delete a category" })
  async remove(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const category = await this.categoriesService.remove(user.restaurantId, id);
    return {
      success: true,
      message: "Category deleted successfully",
      data: category,
    };
  }
}
