import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("customers-crm")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Get and filter list of customers for the restaurant CRM" })
  async getCustomers(
    @CurrentUser() user: any,
    @Query("search") search?: string,
    @Query("vipStatus") vipStatus?: string,
    @Query("tag") tag?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const parsedVip = vipStatus === "true" ? true : vipStatus === "false" ? false : undefined;
    const data = await this.customersService.getCustomers({
      restaurantId: user.restaurantId,
      search,
      vipStatus: parsedVip,
      tag,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return { success: true, data };
  }

  @Get("export/csv")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Export customer CRM to CSV file" })
  async exportCsv(
    @CurrentUser() user: any,
    @Query("search") search: string,
    @Res() res: any
  ) {
    const csvContent = await this.customersService.exportCustomersCsv(user.restaurantId, search);
    res.set({
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=customers-crm.csv`,
    });
    res.send(csvContent);
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Get detailed customer profile, timeline, and history" })
  async getCustomerProfile(@CurrentUser() user: any, @Param("id") id: string) {
    const data = await this.customersService.getCustomerProfile(user.restaurantId, id);
    return { success: true, data };
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Update customer tags, notes, or VIP status" })
  async updateCustomer(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() body: { notes?: string; vipStatus?: boolean; tags?: string }
  ) {
    const data = await this.customersService.updateCustomer(user.restaurantId, id, body);
    return {
      success: true,
      message: "Customer CRM profile updated successfully",
      data,
    };
  }

  @Post("communication/bulk-email")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Send a bulk branded email communication campaign" })
  async sendBulkEmail(
    @CurrentUser() user: any,
    @Body() body: { targetTag?: string; vipOnly?: boolean; subject: string; body: string }
  ) {
    const result = await this.customersService.sendBulkEmail(
      user.restaurantId,
      body.targetTag,
      body.vipOnly,
      body.subject,
      body.body
    );
    return {
      success: true,
      message: `Bulk email campaign complete. Sent: ${result.successCount}, Failed: ${result.failedCount}`,
      data: result,
    };
  }
}
