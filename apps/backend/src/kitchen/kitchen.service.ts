import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsGateway } from "../events/events.gateway";
import { FilterKitchenOrdersDto } from "./dto/filter-kitchen-orders.dto";
import { RejectOrderDto } from "./dto/reject-order.dto";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway
  ) {}

  async getKitchenOrders(restaurantId: string, query: FilterKitchenOrdersDto) {
    const where: any = { restaurantId };

    if (query.branchId) where.branchId = query.branchId;
    if (query.tableId) where.tableId = query.tableId;

    if (query.orderStatus) {
      where.orderStatus = query.orderStatus;
    } else {
      // Default kitchen view shows active orders (PENDING, ACCEPTED, PREPARING, READY)
      where.orderStatus = { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY] };
    }

    let orderBy: any = { createdAt: "asc" };
    if (query.sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (query.sortBy === "oldest" || query.sortBy === "longest_waiting") {
      orderBy = { createdAt: "asc" };
    }

    const ordersRaw = await this.prisma.order.findMany({
      where,
      include: {
        table: true,
        branch: true,
        customer: true,
        session: true,
        orderItems: {
          include: {
            menuItem: true,
            variants: { include: { variant: true } },
            addons: { include: { addon: true } }
          }
        }
      },
      orderBy
    });

    const orders = ordersRaw as any[];

    // Grouping into Kanban columns
    const newOrders: any[] = [];
    const preparingOrders: any[] = [];
    const readyOrders: any[] = [];
    const completedOrders: any[] = [];

    let totalPrepTimeMinutes = 0;
    let completedPrepCount = 0;

    for (const order of orders) {
      const formattedOrder = this.formatKitchenOrder(order);

      if (order.orderStatus === OrderStatus.PENDING) {
        newOrders.push(formattedOrder);
      } else if (order.orderStatus === OrderStatus.ACCEPTED || order.orderStatus === OrderStatus.PREPARING) {
        preparingOrders.push(formattedOrder);
      } else if (order.orderStatus === OrderStatus.READY) {
        readyOrders.push(formattedOrder);
      } else if (order.orderStatus === OrderStatus.SERVED || order.orderStatus === OrderStatus.COMPLETED) {
        completedOrders.push(formattedOrder);
      }

      if (order.preparingStartedAt && order.readyAt) {
        const prepMs = new Date(order.readyAt).getTime() - new Date(order.preparingStartedAt).getTime();
        totalPrepTimeMinutes += prepMs / (1000 * 60);
        completedPrepCount++;
      }
    }

    // Fetch today's metrics
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const ordersTodayCount = await this.prisma.order.count({
      where: { restaurantId, createdAt: { gte: startOfToday } }
    });

    const avgPrepTimeMinutes = completedPrepCount > 0 ? Number((totalPrepTimeMinutes / completedPrepCount).toFixed(1)) : 12;

    return {
      metrics: {
        newOrdersCount: newOrders.length,
        preparingCount: preparingOrders.length,
        readyCount: readyOrders.length,
        avgPrepTimeMinutes,
        ordersTodayCount
      },
      columns: {
        newOrders,
        preparingOrders,
        readyOrders,
        completedOrders
      }
    };
  }

  async getOrderDetails(restaurantId: string, orderId: string) {
    const orderRaw = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        table: true,
        branch: true,
        customer: true,
        session: true,
        orderItems: {
          include: {
            menuItem: true,
            variants: { include: { variant: true } },
            addons: { include: { addon: true } }
          }
        }
      }
    });

    if (!orderRaw) {
      throw new NotFoundException("Order not found.");
    }

    return this.formatKitchenOrder(orderRaw as any);
  }

  async acceptOrder(user: any, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
    if (!order) throw new NotFoundException("Order not found.");

    const isManager = ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(user.role);
    if (!isManager && order.orderStatus !== OrderStatus.PENDING) {
      throw new BadRequestException(`Cannot accept order in status '${order.orderStatus}'. Only PENDING orders can be accepted.`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.PREPARING,
        acceptedAt: new Date(),
        preparingStartedAt: new Date(),
        acceptedById: user.userId,
        preparingStartedById: user.userId
      }
    });

    this.eventsGateway.emitOrderStatusChanged(
      order.restaurantId,
      order.branchId,
      order.sessionId || "",
      order.tableId,
      updated.id,
      "PREPARING",
      { orderId: updated.id, status: "PREPARING" }
    );

    return { success: true, message: "Order accepted and preparation started.", orderId: updated.id, status: updated.orderStatus };
  }

  async startPreparing(user: any, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
    if (!order) throw new NotFoundException("Order not found.");

    const isManager = ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(user.role);
    if (!isManager && order.orderStatus !== OrderStatus.ACCEPTED && order.orderStatus !== OrderStatus.PENDING) {
      throw new BadRequestException(`Cannot start preparing order in status '${order.orderStatus}'. Order must be ACCEPTED first.`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.PREPARING,
        preparingStartedAt: new Date(),
        preparingStartedById: user.userId,
        ...(order.acceptedAt ? {} : { acceptedAt: new Date(), acceptedById: user.userId })
      }
    });

    this.eventsGateway.emitOrderStatusChanged(
      order.restaurantId,
      order.branchId,
      order.sessionId || "",
      order.tableId,
      updated.id,
      "PREPARING",
      { orderId: updated.id, status: "PREPARING" }
    );

    return { success: true, message: "Order preparation started.", orderId: updated.id, status: updated.orderStatus };
  }

  async markReady(user: any, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
    if (!order) throw new NotFoundException("Order not found.");

    const isManager = ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(user.role);
    if (!isManager && order.orderStatus !== OrderStatus.PREPARING && order.orderStatus !== OrderStatus.ACCEPTED) {
      throw new BadRequestException(`Cannot mark order ready from status '${order.orderStatus}'. Order must be PREPARING or ACCEPTED first.`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.READY,
        readyAt: new Date(),
        readyById: user.userId
      }
    });

    this.eventsGateway.emitOrderStatusChanged(
      order.restaurantId,
      order.branchId,
      order.sessionId || "",
      order.tableId,
      updated.id,
      "READY",
      { orderId: updated.id, status: "READY" }
    );

    return { success: true, message: "Order marked ready for pickup.", orderId: updated.id, status: updated.orderStatus };
  }

  async rejectOrder(user: any, orderId: string, dto: RejectOrderDto) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
    if (!order) throw new NotFoundException("Order not found.");

    if (order.paymentStatus === "PAID") {
      throw new BadRequestException("Kitchen cannot reject/cancel an order that has already been paid.");
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        rejectionReason: dto.reason || "Rejected by kitchen staff"
      }
    });

    this.eventsGateway.emitOrderCancelled(
      order.restaurantId,
      order.branchId,
      order.sessionId || "",
      updated.id,
      updated.rejectionReason || "Rejected"
    );

    return { success: true, message: "Order rejected and cancelled.", orderId: updated.id, status: updated.orderStatus };
  }

  private formatKitchenOrder(order: any) {
    const now = new Date().getTime();
    const created = new Date(order.createdAt).getTime();
    const elapsedMinutes = Math.floor((now - created) / (1000 * 60));

    let priority: "NORMAL" | "HIGH" | "URGENT" = "NORMAL";
    if (elapsedMinutes > 20) priority = "URGENT";
    else if (elapsedMinutes > 10) priority = "HIGH";

    const itemList = order.orderItems.map((item: any) => ({
      id: item.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      preparationTime: item.menuItem.preparationTime,
      variants: item.variants.map((v: any) => v.name),
      addons: item.addons.map((a: any) => a.name),
      notes: item.notes || null
    }));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table.tableNumber,
      tableName: order.table.tableName,
      sessionNumber: order.session?.sessionNumber || "N/A",
      customerName: order.customer ? `${order.customer.name}` : "Guest",
      orderStatus: order.orderStatus,
      priority,
      createdAt: order.createdAt,
      acceptedAt: order.acceptedAt,
      preparingStartedAt: order.preparingStartedAt,
      readyAt: order.readyAt,
      elapsedMinutes,
      itemCount: itemList.reduce((sum: number, i: any) => sum + i.quantity, 0),
      items: itemList,
      specialInstructions: order.notes || null,
      rejectionReason: order.rejectionReason || null
    };
  }
}
