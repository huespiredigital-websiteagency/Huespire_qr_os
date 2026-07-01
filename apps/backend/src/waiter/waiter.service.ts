import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsGateway } from "../events/events.gateway";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class WaiterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway
  ) {}

  async getWaiterOrders(restaurantId: string) {
    const where: any = { restaurantId };
    where.orderStatus = { in: [OrderStatus.READY, OrderStatus.SERVED] };

    const ordersRaw = await this.prisma.order.findMany({
      where,
      include: {
        table: true,
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
      orderBy: { updatedAt: "desc" }
    });

    const orders = ordersRaw as any[];

    const readyOrders: any[] = [];
    const servingOrders: any[] = [];
    const servedOrders: any[] = [];

    let totalDeliveryMs = 0;
    let deliveryCount = 0;

    for (const order of orders) {
      const formatted = this.formatWaiterOrder(order);

      if (order.orderStatus === OrderStatus.READY) {
        if (order.pickedUpAt) {
          servingOrders.push(formatted);
        } else {
          readyOrders.push(formatted);
        }
      } else if (order.orderStatus === OrderStatus.SERVED || order.orderStatus === OrderStatus.COMPLETED) {
        servedOrders.push(formatted);
      }

      if (order.readyAt && order.servedAt) {
        const delMs = new Date(order.servedAt).getTime() - new Date(order.readyAt).getTime();
        totalDeliveryMs += delMs;
        deliveryCount++;
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const servedTodayCount = await this.prisma.order.count({
      where: {
        restaurantId,
        orderStatus: { in: [OrderStatus.SERVED, OrderStatus.COMPLETED] },
        updatedAt: { gte: startOfToday }
      }
    });

    const avgDeliveryMinutes = deliveryCount > 0 ? Number((totalDeliveryMs / (deliveryCount * 1000 * 60)).toFixed(1)) : 3.5;

    return {
      metrics: {
        readyCount: readyOrders.length,
        servingCount: servingOrders.length,
        servedTodayCount,
        avgDeliveryMinutes
      },
      sections: {
        readyOrders,
        servingOrders,
        servedOrders
      }
    };
  }

  async pickupOrder(user: any, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
    if (!order) throw new NotFoundException("Order not found.");

    if (order.orderStatus !== OrderStatus.READY) {
      throw new BadRequestException(`Cannot pickup order in status '${order.orderStatus}'. Order must be READY.`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        pickedUpAt: new Date(),
        pickedUpById: user.userId
      }
    });

    this.eventsGateway.emitOrderStatusChanged(
      order.restaurantId,
      order.sessionId || "",
      order.tableId,
      updated.id,
      "SERVING",
      { orderId: updated.id, status: "SERVING", pickedUpAt: updated.pickedUpAt }
    );

    return { success: true, message: "Order picked up for table delivery.", orderId: updated.id };
  }

  async markServed(user: any, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
    if (!order) throw new NotFoundException("Order not found.");

    const isManager = ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(user.role);
    if (!isManager && order.orderStatus !== OrderStatus.READY) {
      throw new BadRequestException(`Cannot mark order served from status '${order.orderStatus}'. Order must be READY.`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.SERVED,
        servedAt: new Date(),
        servedById: user.userId,
        ...(order.pickedUpAt ? {} : { pickedUpAt: new Date(), pickedUpById: user.userId })
      }
    });

    this.eventsGateway.emitOrderStatusChanged(
      order.restaurantId,
      order.sessionId || "",
      order.tableId,
      updated.id,
      "SERVED",
      { orderId: updated.id, status: "SERVED", servedAt: updated.servedAt }
    );

    return { success: true, message: "Order marked served at table.", orderId: updated.id, status: updated.orderStatus };
  }

  async getOrderHistory(restaurantId: string, limit = 20) {
    const ordersRaw = await this.prisma.order.findMany({
      where: {
        restaurantId,
        orderStatus: { in: [OrderStatus.SERVED, OrderStatus.COMPLETED] }
      },
      include: {
        table: true,
        customer: true,
        orderItems: { include: { menuItem: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: Number(limit)
    });

    return (ordersRaw as any[]).map(o => this.formatWaiterOrder(o));
  }

  private formatWaiterOrder(order: any) {
    const now = new Date().getTime();
    const readyTime = order.readyAt ? new Date(order.readyAt).getTime() : new Date(order.createdAt).getTime();
    const elapsedWaitingMinutes = Math.floor((now - readyTime) / (1000 * 60));

    let priority: "NORMAL" | "HIGH" | "URGENT" = "NORMAL";
    if (elapsedWaitingMinutes > 10) priority = "URGENT";
    else if (elapsedWaitingMinutes > 5) priority = "HIGH";

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
      readyAt: order.readyAt,
      pickedUpAt: order.pickedUpAt,
      servedAt: order.servedAt,
      elapsedWaitingMinutes,
      items: order.orderItems.map((item: any) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        variants: item.variants ? item.variants.map((v: any) => v.name) : [],
        addons: item.addons ? item.addons.map((a: any) => a.name) : []
      })),
      specialNotes: order.notes || null
    };
  }
}
