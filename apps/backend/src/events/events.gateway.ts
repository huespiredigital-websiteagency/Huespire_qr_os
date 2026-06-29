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
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

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
          const { restaurantId, branchId, role } = payload;

          if (restaurantId) {
            client.join(`restaurant:${restaurantId}`);
            this.logger.log(`Socket ${client.id} joined room restaurant:${restaurantId}`);
          }
          if (branchId) {
            client.join(`branch:${branchId}`);
            this.logger.log(`Socket ${client.id} joined room branch:${branchId}`);
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

  emitOrderCreated(restaurantId: string, branchId: string, sessionId: string, tableId: string, order: any) {
    this.logger.log(`Broadcasting order.created for order ${order.orderNumber}`);
    // Kitchen & Waiter room
    this.server.to(`branch:${branchId}`).emit("order.created", order);
    // Customer session room
    if (sessionId) this.server.to(`session:${sessionId}`).emit("order.created", order);
    // Owner room
    this.server.to(`restaurant:${restaurantId}`).emit("new.order", order);
    this.server.to(`restaurant:${restaurantId}`).emit("dashboard.metrics.updated", { type: "ORDER_CREATED" });
  }

  emitOrderStatusChanged(restaurantId: string, branchId: string, sessionId: string, tableId: string, orderId: string, status: string, payload: any) {
    this.logger.log(`Broadcasting order status update: ${status} for order ${orderId}`);
    const eventName = `order.${status.toLowerCase()}`;

    // Broadcast to branch staff (Kitchen/Waiter/Cashier)
    this.server.to(`branch:${branchId}`).emit(eventName, payload);
    this.server.to(`branch:${branchId}`).emit("order.status.changed", payload);

    // Broadcast to customer session & table rooms
    if (sessionId) this.server.to(`session:${sessionId}`).emit(eventName, payload);
    if (tableId) this.server.to(`table:${tableId}`).emit(eventName, payload);

    // Broadcast to Owner dashboard
    this.server.to(`restaurant:${restaurantId}`).emit("dashboard.metrics.updated", { type: "ORDER_STATUS_CHANGED", status });
  }

  emitOrderCancelled(restaurantId: string, branchId: string, sessionId: string, orderId: string, reason: string) {
    this.logger.log(`Broadcasting order.cancelled for order ${orderId}`);
    const payload = { orderId, reason, status: "CANCELLED" };
    this.server.to(`branch:${branchId}`).emit("order.cancelled", payload);
    if (sessionId) this.server.to(`session:${sessionId}`).emit("order.cancelled", payload);
    this.server.to(`restaurant:${restaurantId}`).emit("dashboard.metrics.updated", { type: "ORDER_CANCELLED" });
  }

  emitPaymentCompleted(restaurantId: string, branchId: string, sessionId: string, tableId: string, paymentData: any) {
    this.logger.log(`Broadcasting payment.completed for session ${sessionId}`);
    // Cashier & Waiter staff
    this.server.to(`branch:${branchId}`).emit("payment.completed", paymentData);
    this.server.to(`branch:${branchId}`).emit("bill.updated", paymentData);
    this.server.to(`branch:${branchId}`).emit("session.closed", { sessionId, tableId });
    this.server.to(`branch:${branchId}`).emit("table.available", { tableId });

    // Customer session & table
    if (sessionId) {
      this.server.to(`session:${sessionId}`).emit("bill.updated", paymentData);
      this.server.to(`session:${sessionId}`).emit("session.closed", { sessionId });
    }
    if (tableId) {
      this.server.to(`table:${tableId}`).emit("table.available", { tableId });
    }

    // Owner metrics
    this.server.to(`restaurant:${restaurantId}`).emit("payment.completed", paymentData);
    this.server.to(`restaurant:${restaurantId}`).emit("table.status.changed", { tableId, status: "AVAILABLE" });
    this.server.to(`restaurant:${restaurantId}`).emit("dashboard.metrics.updated", { type: "PAYMENT_COMPLETED" });
  }
}
