import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsGateway } from "./events.gateway";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway
  ) {}

  /**
   * Creates a notification, persists it, and broadcasts it via Socket.IO
   */
  async createNotification(data: {
    restaurantId?: string;
    userId?: string;
    type: string;
    title: string;
    message: string;
  }) {
    this.logger.log(`Creating notification: "${data.title}" for type: ${data.type}`);

    const notification = await this.prisma.notification.create({
      data: {
        restaurantId: data.restaurantId || null,
        userId: data.userId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        status: "UNREAD",
        sentAt: new Date(),
      },
    });

    // Broadcast live over Socket.IO
    this.eventsGateway.emitNotification(notification);

    return notification;
  }

  /**
   * Fetches persistent notification history
   */
  async getNotifications(params: {
    restaurantId?: string;
    userId?: string;
    limit?: number;
  }) {
    const { restaurantId, userId, limit = 50 } = params;

    return this.prisma.notification.findMany({
      where: {
        restaurantId: restaurantId || null,
        userId: userId || undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  /**
   * Marks a single notification as read
   */
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: "READ" },
    });
  }

  /**
   * Marks all notifications as read for a restaurant or user context
   */
  async markAllAsRead(params: { restaurantId?: string; userId?: string }) {
    const { restaurantId, userId } = params;

    return this.prisma.notification.updateMany({
      where: {
        restaurantId: restaurantId || null,
        userId: userId || undefined,
        status: "UNREAD",
      },
      data: { status: "READ" },
    });
  }

  /**
   * Deletes a single notification
   */
  async deleteNotification(notificationId: string) {
    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }
}
