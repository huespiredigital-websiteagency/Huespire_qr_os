import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards, Req } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("admin")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get SaaS platform statistics dashboard aggregates" })
  async getStats() {
    return {
      success: true,
      data: await this.adminService.getDashboardStats()
    };
  }

  @Get("restaurants")
  @ApiOperation({ summary: "List all restaurants with search & pagination" })
  async listRestaurants(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
  ) {
    return {
      success: true,
      data: await this.adminService.listRestaurants(Number(page || 1), Number(limit || 10), search || "")
    };
  }

  @Get("restaurants/:id")
  @ApiOperation({ summary: "Get details for a restaurant" })
  async getRestaurant(@Param("id") id: string) {
    return {
      success: true,
      data: await this.adminService.getRestaurant(id)
    };
  }

  @Post("restaurants")
  @ApiOperation({ summary: "Wizard onboarding: create restaurant & owner" })
  async createRestaurant(@Body() body: any) {
    return {
      success: true,
      message: "Restaurant onboarded successfully",
      data: await this.adminService.createRestaurant(body)
    };
  }

  @Patch("restaurants/:id")
  @ApiOperation({ summary: "Update restaurant configurations" })
  async updateRestaurant(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      message: "Restaurant updated successfully",
      data: await this.adminService.updateRestaurant(id, body)
    };
  }

  @Delete("restaurants/:id")
  @ApiOperation({ summary: "Hard delete restaurant and database nodes" })
  async deleteRestaurant(@Param("id") id: string) {
    return {
      success: true,
      message: "Restaurant deleted successfully",
      data: await this.adminService.deleteRestaurant(id)
    };
  }

  @Get("owners")
  @ApiOperation({ summary: "List all platform owner accounts" })
  async listOwners(@Query("page") page?: number, @Query("limit") limit?: number) {
    return {
      success: true,
      data: await this.adminService.listOwners(Number(page || 1), Number(limit || 10))
    };
  }

  @Post("owners/:id/reset-password")
  @ApiOperation({ summary: "Reset password for owner account" })
  async resetOwnerPassword(@Param("id") id: string, @Body() body: any) {
    return await this.adminService.resetOwnerPassword(id, body);
  }

  @Post("restaurants/:id/impersonate")
  @ApiOperation({ summary: "Impersonate restaurant owner to debug dashboard context" })
  async impersonate(@Param("id") id: string, @Req() req: any) {
    return await this.adminService.impersonateOwner(id, req.user);
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "List all subscriptions" })
  async listSubscriptions(@Query("page") page?: number, @Query("limit") limit?: number) {
    return {
      success: true,
      data: await this.adminService.listSubscriptions(Number(page || 1), Number(limit || 10))
    };
  }

  @Patch("subscriptions/:restaurantId")
  @ApiOperation({ summary: "Modify active subscription properties" })
  async updateSubscription(@Param("restaurantId") restaurantId: string, @Body() body: any) {
    return {
      success: true,
      message: "Subscription updated successfully",
      data: await this.adminService.updateSubscription(restaurantId, body)
    };
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "List platform actions audit logs" })
  async listAuditLogs(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
  ) {
    return {
      success: true,
      data: await this.adminService.listAuditLogs(Number(page || 1), Number(limit || 20), search || "")
    };
  }

  @Get("health")
  @ApiOperation({ summary: "Monitor node and hardware stats" })
  async getHealth() {
    return {
      success: true,
      data: await this.adminService.getSystemHealth()
    };
  }
}
