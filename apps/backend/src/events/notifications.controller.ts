import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("notifications")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly eventsGateway: EventsGateway) {}

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
      message: "Push subscription registered successfully"
    };
  }
}
