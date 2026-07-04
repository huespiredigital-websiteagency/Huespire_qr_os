import { Controller, Get, Post, Param, Query, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { EmailService } from "./email.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("email-logs")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("email/logs")
export class EmailLogController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Get sent email audit logs for the restaurant" })
  async getEmailLogs(
    @CurrentUser() user: any,
    @Query("recipient") recipient?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string
  ) {
    const where: any = {};
    
    // Scoping check: Super Admin can view all, others view their own restaurant logs
    if (user.role !== "SUPER_ADMIN") {
      where.restaurantId = user.restaurantId;
    }

    if (recipient) {
      where.recipient = { contains: recipient, mode: "insensitive" };
    }

    if (status) {
      where.status = status;
    }

    const data = await this.prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit ? Number(limit) : 50,
    });

    return {
      success: true,
      message: "Email audit logs retrieved successfully",
      data,
    };
  }

  @Post(":id/retry")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Manually retry sending a failed email transaction" })
  async retryEmail(
    @CurrentUser() user: any,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    const success = await this.emailService.retryEmail(id);
    return {
      success,
      message: success
        ? "Email retry dispatched and delivered successfully."
        : "Email retry failed. Review error message details in the logs.",
    };
  }
}
