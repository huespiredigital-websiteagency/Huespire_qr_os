import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as webpush from "web-push";

interface PushSubscriptionItem {
  subscription: any;
  restaurantId: string;
  role: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private pushSubscriptions: PushSubscriptionItem[] = [];

  constructor(private readonly jwtService: JwtService) {}

  onModuleInit() {
    try {
      webpush.setVapidDetails(
        "mailto:admin@huespire.com",
        "BLMyuWbIgcWmOVdZNt9IE8Ut5ndE4-PIlgzJkmNFudIYv98XeE0nD06F49jnmmf0j1erzCnon1J2HVVL7Nk_naw",
        "Ev-jLdocnBROyrcSFrv_AQ1oP3ytYiZWh0fgqvNssPg"
      );
      this.logger.log("VAPID details configured successfully for Web Push.");
    } catch (err: any) {
      this.logger.error("Failed to set VAPID details: " + err.message);
    }
  }

  addPushSubscription(subscription: any, restaurantId: string, role: string) {
    if (!subscription || !subscription.endpoint) return;
    this.pushSubscriptions = this.pushSubscriptions.filter(
      (s) => s.subscription.endpoint !== subscription.endpoint
    );
    this.pushSubscriptions.push({ subscription, restaurantId, role });
    this.logger.log(`Registered web-push subscription for role ${role} in restaurant ${restaurantId}`);
  }

  async sendPushNotification(restaurantId: string, targetRole: string, title: string, body: string, url: string) {
    const targets = this.pushSubscriptions.filter(
      (s) => s.restaurantId === restaurantId && (s.role === targetRole || s.role === "OWNER" || s.role === "MANAGER")
    );

    this.logger.log(`Sending web push to ${targets.length} subscriptions for role ${targetRole} / manager`);

    const payload = JSON.stringify({ title, body, url });

    for (const target of targets) {
      try {
        await webpush.sendNotification(target.subscription, payload);
      } catch (err: any) {
        this.logger.warn(`Push failed for endpoint ${target.subscription.endpoint}: ${err.message}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          this.pushSubscriptions = this.pushSubscriptions.filter(
            (s) => s.subscription.endpoint !== target.subscription.endpoint
          );
        }
      }
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");
      const sessionId = client.handshake.auth?.sessionId || client.handshake.query?.sessionId;

      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          client.data.user = payload;
          const { restaurantId, role, id: userId } = payload;

          if (restaurantId) {
            client.join(`restaurant:${restaurantId}`);
            this.logger.log(`Socket ${client.id} joined room restaurant:${restaurantId}`);
          } else if (role === "SUPER_ADMIN") {
            client.join("super_admin");
            this.logger.log(`Socket ${client.id} joined room super_admin`);
          }

          if (userId) {
            client.join(`user:${userId}`);
            this.logger.log(`Socket ${client.id} joined room user:${userId}`);
          }

          this.logger.log(`Socket connected: ${client.id} (User: ${payload.email}, Role: ${role})`);
        } catch (err) {
          this.logger.warn(`Invalid JWT token for socket ${client.id}. Proceeding as guest.`);
        }
      }

      if (sessionId) {
        client.join(`session:${sessionId}`);
        this.logger.log(`Socket ${client.id} joined room session:${sessionId}`);
      }
    } catch (error: any) {
      this.logger.error(`Error during socket connection ${client.id}: ${error.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage("join.session")
  handleJoinSession(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; tableId?: string }) {
    if (data.sessionId) {
      client.join(`session:${data.sessionId}`);
      this.logger.log(`Socket ${client.id} joined session:${data.sessionId}`);
    }
    if (data.tableId) {
      client.join(`table:${data.tableId}`);
      this.logger.log(`Socket ${client.id} joined table:${data.tableId}`);
    }
    return { status: "joined", sessionId: data.sessionId };
  }

  // Helper Broadcasting Methods called by REST Services

  emitOrderCreated(restaurantId: string, sessionId: string, tableId: string, order: any) {
    this.logger.log(`Broadcasting order.created for order ${order.orderNumber}`);
    
    if (restaurantId) {
      this.server.to(`restaurant:${restaurantId}`).emit("order.created", order);
      this.server.to(`restaurant:${restaurantId}`).emit("new.order", order);
      this.server.to(`restaurant:${restaurantId}`).emit("dashboard.metrics.updated", { type: "ORDER_CREATED" });

      // Send Web Push notification to KITCHEN staff
      const isAdd = order.isAdditional;
      const title = isAdd ? "⚡ Additional Items Added" : "🔔 New Order Received";
      const body = `Table ${order.table?.tableNumber || "?"} - ${order.orderItems?.length || 1} items.`;
      this.sendPushNotification(restaurantId, "KITCHEN", title, body, "/dashboard/kitchen");
    }

    // Customer session room
    if (sessionId) this.server.to(`session:${sessionId}`).emit("order.created", order);
  }

  emitOrderStatusChanged(restaurantId: string, sessionId: string, tableId: string, orderId: string, status: string, payload: any) {
    this.logger.log(`Broadcasting order status update: ${status} for order ${orderId}`);
    const eventName = `order.${status.toLowerCase()}`;

    if (restaurantId) {
      this.server.to(`restaurant:${restaurantId}`).emit(eventName, payload);
      this.server.to(`restaurant:${restaurantId}`).emit("order.status.changed", payload);
      this.server.to(`restaurant:${restaurantId}`).emit("dashboard.metrics.updated", { type: "ORDER_STATUS_CHANGED", status });

      // Send Web Push notification to WAITER staff when food is ready
      if (status === "READY") {
        const title = "🍽️ Food Ready to Serve";
        const body = `Table ${payload.tableNumber || "?"} - Order #${payload.orderNumber || ""} is ready.`;
        this.sendPushNotification(restaurantId, "WAITER", title, body, "/dashboard/waiter");
      }
    }

    // Broadcast to customer session & table rooms
    if (sessionId) this.server.to(`session:${sessionId}`).emit(eventName, payload);
    if (tableId) this.server.to(`table:${tableId}`).emit(eventName, payload);
  }

  emitOrderCancelled(restaurantId: string, sessionId: string, orderId: string, reason: string) {
    this.logger.log(`Broadcasting order.cancelled for order ${orderId}`);
    const payload = { orderId, reason, status: "CANCELLED" };
    
    if (restaurantId) {
      this.server.to(`restaurant:${restaurantId}`).emit("order.cancelled", payload);
      this.server.to(`restaurant:${restaurantId}`).emit("dashboard.metrics.updated", { type: "ORDER_CANCELLED" });
    }

    if (sessionId) this.server.to(`session:${sessionId}`).emit("order.cancelled", payload);
  }

  emitPaymentCompleted(restaurantId: string, sessionId: string, tableId: string, paymentData: any) {
    this.logger.log(`Broadcasting payment.completed for session ${sessionId}`);
    
    if (restaurantId) {
      this.server.to(`restaurant:${restaurantId}`).emit("payment.completed", paymentData);
      this.server.to(`restaurant:${restaurantId}`).emit("bill.updated", paymentData);
      this.server.to(`restaurant:${restaurantId}`).emit("session.closed", { sessionId, tableId });
      this.server.to(`restaurant:${restaurantId}`).emit("table.available", { tableId });
      this.server.to(`restaurant:${restaurantId}`).emit("table.status.changed", { tableId, status: "AVAILABLE" });
      this.server.to(`restaurant:${restaurantId}`).emit("dashboard.metrics.updated", { type: "PAYMENT_COMPLETED" });
    }

    // Customer session & table
    if (sessionId) {
      this.server.to(`session:${sessionId}`).emit("bill.updated", paymentData);
      this.server.to(`session:${sessionId}`).emit("session.closed", { sessionId });
    }
    if (tableId) {
      this.server.to(`table:${tableId}`).emit("table.available", { tableId });
    }
  }

  emitNotification(notification: any) {
    this.logger.log(`Broadcasting notification: ${notification.title}`);
    if (notification.userId) {
      this.server.to(`user:${notification.userId}`).emit("notification", notification);
    } else if (notification.restaurantId) {
      this.server.to(`restaurant:${notification.restaurantId}`).emit("notification", notification);
    } else {
      this.server.to("super_admin").emit("notification", notification);
    }
  }
}
