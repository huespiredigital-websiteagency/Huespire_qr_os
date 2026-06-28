import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpStatus, HttpCode, Query, ForbiddenException, BadRequestException } from "@nestjs/common";
import { StaffService } from "./staff.service";
import { InviteStaffDto } from "./dto/invite-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

@ApiTags("staff")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller("staff")
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "List all registered staff members of the restaurant" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Staff list retrieved successfully" })
  async findAll(@CurrentUser() user: any, @Query("restaurantId") restaurantId?: string) {
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

    const staffList = await this.staffService.findAll(targetRestaurantId);
    return {
      success: true,
      message: "Staff list retrieved successfully",
      data: staffList.map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        role: s.role.code,
        isActive: s.isActive,
        lastLoginAt: s.lastLoginAt,
      })),
    };
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Get staff member details by id" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Staff member details retrieved successfully" })
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

    const s = await this.staffService.findOne(targetRestaurantId, id);
    return {
      success: true,
      message: "Staff member details retrieved successfully",
      data: {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        role: s.role.code,
        isActive: s.isActive,
        lastLoginAt: s.lastLoginAt,
      },
    };
  }

  @Post("invite")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Invite/Onboard a new manager, chef, waiter, or cashier" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 201, description: "Staff onboarded successfully. Returns temporary password." })
  async invite(
    @Body() body: InviteStaffDto,
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

    const result = await this.staffService.invite(targetRestaurantId, body);
    return {
      success: true,
      message: "Staff onboarded successfully",
      data: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: result.user.role.code,
        temporaryPassword: result.temporaryPassword,
      },
    };
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Modify staff configurations (Role assignment, active status)" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Staffconfigurations updated successfully" })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateStaffDto,
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

    const s = await this.staffService.update(targetRestaurantId, id, body);
    return {
      success: true,
      message: "Staff configurations updated successfully",
      data: {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        role: s.role.code,
        isActive: s.isActive,
      },
    };
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER")
  @ApiOperation({ summary: "Soft delete a staff profile" })
  @ApiQuery({ name: "restaurantId", required: false, description: "Restaurant ID (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Staff member deleted successfully" })
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

    const s = await this.staffService.remove(targetRestaurantId, id);
    return {
      success: true,
      message: "Staff member deleted successfully",
      data: {
        id: s.id,
        email: s.email,
        isActive: s.isActive,
      },
    };
  }
}
