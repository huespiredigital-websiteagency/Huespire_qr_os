import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("notifications")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService
  ) {}

  @Post("subscribe")
  @ApiOperation({ summary: "Register a web push notification subscription" })
  async subscribe(
    @CurrentUser() user: any,
    @Body() body: { subscription: any }
  ) {
    this.eventsGateway.addPushSubscription(
      body.subscription,
      user.restaurantId,
      user.role
    );
    return {
      success: true,
      message: "Push subscription registered successfully",
    };
  }

  @Get()
  @ApiOperation({ summary: "Get notifications for current user/restaurant" })
  async getNotifications(
    @CurrentUser() user: any,
    @Query("limit") limit?: number
  ) {
    const notifications = await this.notificationsService.getNotifications({
      restaurantId: user.restaurantId || undefined,
      userId: user.role === "SUPER_ADMIN" ? undefined : user.id,
      limit: limit ? Number(limit) : 50,
    });
    return { success: true, data: notifications };
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a single notification as read" })
  async markAsRead(@Param("id") id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true, message: "Notification marked as read" };
  }

  @Post("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllAsRead({
      restaurantId: user.restaurantId || undefined,
      userId: user.role === "SUPER_ADMIN" ? undefined : user.id,
    });
    return { success: true, message: "All notifications marked as read" };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a notification" })
  async deleteNotification(@Param("id") id: string) {
    await this.notificationsService.deleteNotification(id);
    return { success: true, message: "Notification deleted" };
  }
}
