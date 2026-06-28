import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpStatus, HttpCode, Query, ForbiddenException, BadRequestException } from "@nestjs/common";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

@ApiTags("branches")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller("branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Get all branches of the resolved restaurant" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Branches retrieved successfully" })
  async findAll(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
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

    return this.branchesService.findAll(targetRestaurantId, paginationDto);
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Get branch details by id" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Branch details retrieved successfully" })
  async findOne(@Param("id") id: string, @CurrentUser() user: any, @Query("restaurantId") restaurantId?: string) {
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

    const branch = await this.branchesService.findOne(targetRestaurantId, id);
    return {
      success: true,
      message: "Branch details retrieved successfully",
      data: branch,
    };
  }

  @Post()
  @Roles("SUPER_ADMIN", "OWNER")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new branch (Owner/Super Admin only)" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 201, description: "Branch created successfully" })
  async create(
    @Body() createBranchDto: CreateBranchDto,
    @CurrentUser() user: any,
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

    const branch = await this.branchesService.create(targetRestaurantId, createBranchDto);
    return {
      success: true,
      message: "Branch created successfully",
      data: branch,
    };
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Update branch configurations" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Branch configurations updated successfully" })
  async update(
    @Param("id") id: string,
    @Body() updateBranchDto: UpdateBranchDto,
    @CurrentUser() user: any,
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

    const branch = await this.branchesService.update(targetRestaurantId, id, updateBranchDto);
    return {
      success: true,
      message: "Branch configurations updated successfully",
      data: branch,
    };
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER")
  @ApiOperation({ summary: "Soft delete a branch (Owner/Super Admin only)" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Branch soft deleted successfully" })
  async remove(@Param("id") id: string, @CurrentUser() user: any, @Query("restaurantId") restaurantId?: string) {
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

    const branch = await this.branchesService.remove(targetRestaurantId, id);
    return {
      success: true,
      message: "Branch soft deleted successfully",
      data: branch,
    };
  }
}
