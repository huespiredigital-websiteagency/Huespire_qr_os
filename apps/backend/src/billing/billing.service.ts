import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsGateway } from "../events/events.gateway";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";
import { FilterPaymentsQueryDto } from "./dto/filter-payments.dto";
import { PaymentMethod, PaymentStatus, BillStatus, TableStatus, TableSessionStatus, OrderStatus } from "@prisma/client";
import { EmailService } from "../email/email.service";
import { getCustomerInvoiceTemplate } from "../email/email-templates";
import { generateInvoicePdf } from "./pdf-generator";

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly emailService: EmailService
  ) {}

  async getCashierSessions(restaurantId: string, search?: string) {
    const numSearch = parseInt(search || "", 10);
    const isValidNum = !isNaN(numSearch);

    const sessions = await this.prisma.tableSession.findMany({
      where: {
        restaurantId,
        ...(search
          ? {
              OR: [
                { sessionNumber: { contains: search } },
                { table: { tableName: { contains: search } } },
                ...(isValidNum ? [{ table: { tableNumber: numSearch } }] : []),
                { bills: { some: { billNumber: { contains: search } } } }
              ]
            }
          : {})
      },
      include: {
        table: true,
        bills: { orderBy: { createdAt: "desc" }, take: 1 },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        orders: {
          where: { orderStatus: { not: "CANCELLED" } },
          include: {
            customer: true,
            orderItems: {
              include: {
                menuItem: true,
                variants: { include: { variant: true } },
                addons: { include: { addon: true } }
              }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const activeSessions: any[] = [];
    const openBills: any[] = [];
    const readyForPayment: any[] = [];
    const paidBills: any[] = [];
    const closedBills: any[] = [];

    for (const sessionRaw of sessions) {
      const session = sessionRaw as any;
      let totalSubtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      let totalAmount = 0;
      let hasUnservedOrders = false;

      for (const order of session.orders) {
        totalSubtotal += Number(order.subtotal);
        totalTax += Number(order.tax);
        totalDiscount += Number(order.discount);
        totalAmount += Number(order.totalAmount);
        if (order.orderStatus !== OrderStatus.SERVED && order.orderStatus !== OrderStatus.COMPLETED) {
          hasUnservedOrders = true;
        }
      }

      const latestBill = session.bills[0] || null;
      const latestPayment = session.payments[0] || null;

      const formattedSession = {
        id: session.id,
        sessionNumber: session.sessionNumber,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        table: {
          id: session.table.id,
          tableNumber: session.table.tableNumber,
          capacity: session.table.capacity,
          status: session.table.status
        },
        ordersCount: session.orders.length,
        hasUnservedOrders,
        summary: {
          subtotal: totalSubtotal,
          tax: totalTax,
          discount: totalDiscount,
          grandTotal: totalAmount
        },
        latestBill,
        latestPayment
      };

      if (session.status === TableSessionStatus.CLOSED) {
        closedBills.push(formattedSession);
        if (latestPayment?.paymentStatus === PaymentStatus.PAID) {
          paidBills.push(formattedSession);
        }
      } else {
        activeSessions.push(formattedSession);
        if (latestBill && latestBill.status === BillStatus.OPEN) {
          openBills.push(formattedSession);
        }
        if (!hasUnservedOrders && session.orders.length > 0) {
          readyForPayment.push(formattedSession);
        }
      }
    }

    return {
      activeSessions,
      openBills,
      readyForPayment,
      paidBills,
      closedBills
    };
  }

  async getSessionBill(restaurantId: string, sessionId: string) {
    const sessionRaw = await this.prisma.tableSession.findFirst({
      where: { id: sessionId, restaurantId },
      include: {
        table: true,
        restaurant: {
          include: { settings: true }
        },
        bills: { orderBy: { createdAt: "desc" }, take: 1 },
        orders: {
          where: { orderStatus: { not: "CANCELLED" } },
          include: {
            customer: true,
            orderItems: {
              include: {
                menuItem: true,
                variants: { include: { variant: true } },
                addons: { include: { addon: true } }
              }
            }
          }
        }
      }
    });

    if (!sessionRaw) {
      throw new NotFoundException("Table session not found.");
    }
    const session = sessionRaw as any;

    let subtotal = 0;
    let discountAmount = 0;
    const itemizedList: any[] = [];

    for (const order of session.orders) {
      discountAmount += Number(order.discount);
      for (const item of order.orderItems) {
        const unitPrice = Number(item.unitPrice);
        const itemSubtotal = Number(item.subtotal);
        subtotal += itemSubtotal;

        itemizedList.push({
          orderItemId: item.id,
          orderNumber: order.orderNumber,
          itemName: item.menuItem.name,
          quantity: item.quantity,
          unitPrice,
          subtotal: itemSubtotal,
          variants: item.variants.map((v: any) => ({ name: v.name, price: Number(v.price) })),
          addons: item.addons.map((a: any) => ({ name: a.name, price: Number(a.additionalPrice) }))
        });
      }
    }

    const taxPercentage = Number(session.restaurant.settings?.taxPercentage ?? session.restaurant.taxPercentage ?? 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number(((taxableAmount * taxPercentage) / 100).toFixed(2));
    const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

    let bill = session.bills[0];
    if (!bill || bill.status !== BillStatus.OPEN) {
      const billCount = await this.prisma.bill.count({ where: { restaurantId } });
      const billNumber = `BILL-${String(billCount + 1).padStart(5, "0")}`;

      bill = await this.prisma.bill.create({
        data: {
          restaurantId: session.restaurantId,
          tableSessionId: session.id,
          billNumber,
          subtotal,
          taxAmount,
          discountAmount,
          grandTotal,
          status: BillStatus.OPEN
        }
      });
    } else {
      bill = await this.prisma.bill.update({
        where: { id: bill.id },
        data: {
          subtotal,
          taxAmount,
          discountAmount,
          grandTotal
        }
      });
    }

    return {
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        status: bill.status,
        createdAt: bill.createdAt
      },
      session: {
        id: session.id,
        sessionNumber: session.sessionNumber,
        status: session.status,
        openedAt: session.openedAt
      },
      table: {
        id: session.table.id,
        tableNumber: session.table.tableNumber
      },
      restaurant: {
        name: session.restaurant.name,
        currency: session.restaurant.currency,
        phone: session.restaurant.phone,
        address: session.restaurant.address,
        receiptFooter: session.restaurant.settings?.receiptFooter ?? "Thank you for dining with us!"
      },
      financials: {
        subtotal,
        discountAmount,
        taxPercentage,
        taxAmount,
        grandTotal
      },
      itemizedList
    };
  }

  async confirmPayment(user: any, dto: ConfirmPaymentDto) {
    const sessionData = await this.getSessionBill(user.restaurantId, dto.sessionId);
    const { bill, financials, session, table, itemizedList } = sessionData;

    if (session.status === TableSessionStatus.CLOSED) {
      throw new BadRequestException("This table session is already closed.");
    }

    const firstOrderWithCustomer = await this.prisma.order.findFirst({
      where: { sessionId: session.id, customerId: { not: null } },
      include: { customer: true }
    });

    const restDetails = await this.prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      include: { settings: true }
    });

    let amountReceived = dto.amountReceived;
    let changeGiven = 0;

    if (dto.paymentMethod === PaymentMethod.CASH) {
      if (!amountReceived || amountReceived < financials.grandTotal) {
        throw new BadRequestException(`Received amount (${amountReceived || 0}) is less than grand total (${financials.grandTotal}).`);
      }
      changeGiven = Number((amountReceived - financials.grandTotal).toFixed(2));
    } else {
      amountReceived = financials.grandTotal;
      changeGiven = 0;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          restaurantId: user.restaurantId,
          tableSessionId: session.id,
          billId: bill.id,
          paymentMethod: dto.paymentMethod,
          paymentStatus: PaymentStatus.PAID,
          amount: financials.grandTotal,
          amountReceived,
          changeGiven,
          receivedById: user.userId,
          paidAt: new Date(),
          notes: dto.notes || null
        }
      });

      await tx.bill.update({
        where: { id: bill.id },
        data: { status: BillStatus.PAID }
      });

      await tx.order.updateMany({
        where: { sessionId: session.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.COMPLETED
        }
      });

      await tx.tableSession.update({
        where: { id: session.id },
        data: {
          status: TableSessionStatus.CLOSED,
          closedAt: new Date(),
          closedBy: user.userId,
          totalAmount: financials.grandTotal
        }
      });

      await tx.table.update({
        where: { id: table.id },
        data: { status: TableStatus.AVAILABLE }
      });

      // Update customer CRM metrics
      if (firstOrderWithCustomer && firstOrderWithCustomer.customerId) {
        await tx.customer.update({
          where: { id: firstOrderWithCustomer.customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: financials.grandTotal },
            lastVisitAt: new Date(),
            loyaltyPoints: { increment: Math.floor(financials.grandTotal / 100) },
            ...(dto.customerEmail ? { email: dto.customerEmail } : {}),
            ...(dto.customerName ? { name: dto.customerName } : {}),
          }
        });
      }

      return payment;
    });

    this.eventsGateway.emitPaymentCompleted(
      user.restaurantId,
      session.id,
      table.id,
      {
        paymentId: result.id,
        billNumber: bill.billNumber,
        amount: result.amount,
        paymentMethod: result.paymentMethod
      }
    );

    // Send automated email receipt if customer email is provided
    if (dto.customerEmail && restDetails) {
      try {
        const branding = {
          name: restDetails.name,
          logoUrl: restDetails.logoUrl || undefined,
          primaryColor: restDetails.settings?.primaryColor || "#6366f1",
          secondaryColor: restDetails.settings?.secondaryColor || "#10b981",
          emailFooter: restDetails.settings?.emailFooter || undefined,
          website: restDetails.settings?.website || undefined,
        };

        const invoiceDetails = {
          invoiceNumber: bill.billNumber,
          orderNumber: session.sessionNumber,
          tableNumber: table.tableNumber.toString(),
          customerName: dto.customerName || "Customer",
          items: itemizedList.map((i: any) => ({
            name: i.itemName,
            quantity: i.quantity,
            price: i.unitPrice,
          })),
          subtotal: financials.subtotal,
          tax: financials.taxAmount,
          discount: financials.discountAmount,
          total: financials.grandTotal,
          paymentMethod: dto.paymentMethod,
          dateTime: new Date().toLocaleString(),
        };

        const emailHtml = getCustomerInvoiceTemplate(
          dto.customerName || "Valued Customer",
          invoiceDetails,
          branding
        );

        await this.emailService.sendEmail(
          dto.customerEmail,
          `Your Receipt from ${restDetails.name} - ${bill.billNumber}`,
          emailHtml,
          user.restaurantId
        );
      } catch (emailErr: any) {
        console.error(`Failed to send automated email receipt: ${emailErr.message}`);
      }
    }

    return {
      success: true,
      message: "Payment confirmed and table session closed successfully.",
      paymentId: result.id,
      billNumber: bill.billNumber,
      changeGiven
    };
  }

  async getReceiptPayload(restaurantId: string, paymentId: string) {
    const paymentRaw = await this.prisma.payment.findFirst({
      where: { id: paymentId, restaurantId },
      include: {
        bill: true,
        tableSession: {
          include: {
            table: true,
            orders: {
              where: { orderStatus: { not: "CANCELLED" } },
              include: {
                orderItems: {
                  include: {
                    menuItem: true,
                    variants: { include: { variant: true } },
                    addons: { include: { addon: true } }
                  }
                }
              }
            }
          }
        },
        receivedBy: true,
        restaurant: {
          include: { settings: true }
        }
      }
    });

    if (!paymentRaw) {
      throw new NotFoundException("Payment record not found.");
    }
    const payment = paymentRaw as any;

    const items: any[] = [];
    let subtotal = 0;
    let totalDiscount = 0;

    for (const order of payment.tableSession.orders) {
      totalDiscount += Number(order.discount);
      for (const item of order.orderItems) {
        const itemSubtotal = Number(item.subtotal);
        subtotal += itemSubtotal;
        items.push({
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: itemSubtotal,
          variants: item.variants.map((v: any) => v.name),
          addons: item.addons.map((a: any) => a.name)
        });
      }
    }

    return {
      restaurant: {
        name: payment.restaurant.name,
        address: payment.restaurant.address || "Main Address",
        phone: payment.restaurant.phone,
        currency: payment.restaurant.currency,
        footer: payment.restaurant.settings?.receiptFooter || "Thank you for dining with us!"
      },
      billNumber: payment.bill?.billNumber || "N/A",
      sessionNumber: payment.tableSession.sessionNumber,
      tableNumber: payment.tableSession.table.tableNumber,
      cashierName: payment.receivedBy ? `${payment.receivedBy.firstName} ${payment.receivedBy.lastName || ""}`.trim() : "Cashier",
      paidAt: payment.paidAt || payment.createdAt,
      paymentMethod: payment.paymentMethod,
      financials: {
        subtotal,
        discount: totalDiscount,
        tax: Number(payment.bill?.taxAmount ?? 0),
        grandTotal: Number(payment.amount),
        amountReceived: Number(payment.amountReceived ?? payment.amount),
        changeGiven: Number(payment.changeGiven ?? 0)
      },
      items
    };
  }

  async getPaymentReports(restaurantId: string, query: FilterPaymentsQueryDto) {
    const where: any = { restaurantId, paymentStatus: PaymentStatus.PAID };

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }
    if (query.cashierId) {
      where.receivedById = query.cashierId;
    }
    if (query.startDate || query.endDate) {
      where.paidAt = {};
      if (query.startDate) where.paidAt.gte = new Date(query.startDate);
      if (query.endDate) where.paidAt.lte = new Date(query.endDate);
    }

    const paymentsRaw = await this.prisma.payment.findMany({
      where,
      include: {
        bill: true,
        tableSession: { include: { table: true } },
        receivedBy: true
      },
      orderBy: { paidAt: "desc" }
    });

    const payments = paymentsRaw as any[];
    const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    return {
      totalRevenue,
      count: payments.length,
      payments: payments.map(p => ({
        id: p.id,
        billNumber: p.bill?.billNumber || "N/A",
        tableNumber: p.tableSession.table.tableNumber,
        sessionNumber: p.tableSession.sessionNumber,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        cashierName: p.receivedBy ? `${p.receivedBy.firstName} ${p.receivedBy.lastName || ""}`.trim() : "System",
        paidAt: p.paidAt || p.createdAt
      }))
    };
  }

  async generateReceiptPdf(restaurantId: string, paymentId: string): Promise<Buffer> {
    const payload = await this.getReceiptPayload(restaurantId, paymentId);
    
    // Fetch settings for branding
    const settings = await this.prisma.restaurantSettings.findUnique({
      where: { restaurantId }
    });

    const branding = {
      name: payload.restaurant.name,
      primaryColor: settings?.primaryColor || "#6366f1",
      secondaryColor: settings?.secondaryColor || "#10b981",
      address: payload.restaurant.address,
      phone: payload.restaurant.phone,
      invoiceFooter: settings?.invoiceFooter || "Thank you for dining with us!",
    };

    const invoiceDetails = {
      invoiceNumber: payload.billNumber,
      orderNumber: payload.sessionNumber,
      tableNumber: payload.tableNumber.toString(),
      customerName: "Valued Customer",
      items: payload.items.map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.unitPrice,
      })),
      subtotal: payload.financials.subtotal,
      tax: payload.financials.tax,
      discount: payload.financials.discount,
      total: payload.financials.grandTotal,
      paymentMethod: payload.paymentMethod,
      dateTime: payload.paidAt.toLocaleString(),
    };

    return generateInvoicePdf(invoiceDetails, branding);
  }
}
