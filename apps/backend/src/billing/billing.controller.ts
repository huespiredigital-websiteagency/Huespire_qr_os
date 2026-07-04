import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe, Res } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";
import { FilterPaymentsQueryDto } from "./dto/filter-payments.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("billing")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("cashier/sessions")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Get cashier dashboard sessions & bills overview" })
  async getCashierSessions(
    @CurrentUser() user: any,
    @Query("search") search?: string
  ) {
    const data = await this.billingService.getCashierSessions(user.restaurantId, search);
    return {
      success: true,
      message: "Cashier sessions retrieved successfully",
      data
    };
  }

  @Get("bills/session/:sessionId")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Get or generate consolidated bill details for a session" })
  async getSessionBill(
    @CurrentUser() user: any,
    @Param("sessionId", ParseUUIDPipe) sessionId: string
  ) {
    const data = await this.billingService.getSessionBill(user.restaurantId, sessionId);
    return {
      success: true,
      message: "Session bill retrieved successfully",
      data
    };
  }

  @Post("payments/confirm")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Confirm manual physical payment and close table session" })
  async confirmPayment(
    @CurrentUser() user: any,
    @Body() dto: ConfirmPaymentDto
  ) {
    const data = await this.billingService.confirmPayment(user, dto);
    return {
      success: true,
      message: "Payment confirmed and table session closed successfully",
      data
    };
  }

  @Get("payments/receipt/:paymentId")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Get detailed printable receipt payload for a payment" })
  async getReceiptPayload(
    @CurrentUser() user: any,
    @Param("paymentId", ParseUUIDPipe) paymentId: string
  ) {
    const data = await this.billingService.getReceiptPayload(user.restaurantId, paymentId);
    return {
      success: true,
      message: "Receipt payload generated successfully",
      data
    };
  }

  @Get("payments/reports")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Get payment history and auditing reports" })
  async getPaymentReports(
    @CurrentUser() user: any,
    @Query() query: FilterPaymentsQueryDto
  ) {
    const data = await this.billingService.getPaymentReports(user.restaurantId, query);
    return {
      success: true,
      message: "Payment reports retrieved successfully",
      data
    };
  }

  @Get("payments/receipt/:paymentId/pdf")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Get detailed printable receipt PDF for a payment" })
  async getReceiptPdf(
    @CurrentUser() user: any,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @Res() res: any
  ) {
    const pdfBuffer = await this.billingService.generateReceiptPdf(user.restaurantId, paymentId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=receipt-${paymentId}.pdf`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
