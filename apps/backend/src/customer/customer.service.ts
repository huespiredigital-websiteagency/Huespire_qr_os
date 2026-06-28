import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CartItemDto, ValidateCartDto } from "./dto/validate-cart.dto";
import { CreateCustomerOrderDto } from "./dto/create-customer-order.dto";
import { QRCode, Order } from "@prisma/client";

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async validateToken(token: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { qrToken: token },
      select: {
        id: true,
        isActive: true,
        table: {
          select: {
            id: true,
            tableName: true,
            tableNumber: true,
            seatingCapacity: true,
            isActive: true,
            deletedAt: true,
            branch: {
              select: {
                id: true,
                name: true,
                isActive: true,
                deletedAt: true,
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    currency: true,
                    taxPercentage: true,
                    isActive: true,
                    deletedAt: true,
                    settings: {
                      select: {
                        theme: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!qrCode) {
      throw new NotFoundException("QR Code not found");
    }

    if (!qrCode.isActive) {
      throw new BadRequestException("QR Code is inactive");
    }

    const table = qrCode.table;
    if (!table || table.deletedAt || !table.isActive) {
      throw new BadRequestException("Table is inactive or deleted");
    }

    const branch = table.branch;
    if (!branch || branch.deletedAt || !branch.isActive) {
      throw new BadRequestException("Branch is inactive or deleted");
    }

    const restaurant = branch.restaurant;
    if (!restaurant || restaurant.deletedAt || !restaurant.isActive) {
      throw new BadRequestException("Restaurant is inactive or deleted");
    }

    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      logoUrl: restaurant.logoUrl,
      theme: restaurant.settings?.theme || "light",
      currency: restaurant.currency,
      taxPercentage: Number(restaurant.taxPercentage) || 0,
      branchId: branch.id,
      branchName: branch.name,
      tableId: table.id,
      tableName: table.tableName,
      tableNumber: table.tableNumber,
      seatingCapacity: table.seatingCapacity,
    };
  }

  async getMenu(token: string) {
    const qrDetails = await this.validateToken(token);
    const { restaurantId } = qrDetails;

    const categories = await this.prisma.category.findMany({
      where: { restaurantId, isActive: true, deletedAt: null },
      orderBy: { displayOrder: "asc" },
      include: {
        menuItems: {
          where: { isAvailable: true, deletedAt: null },
          orderBy: { displayOrder: "asc" },
          include: {
            images: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" } },
            variants: { where: { isAvailable: true }, orderBy: { displayOrder: "asc" } },
          }
        }
      }
    });

    // Addons are global, retrieve all active addons for the restaurant
    const addons = await this.prisma.addon.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { displayOrder: "asc" }
    });

    // Find active table session
    const activeSession = await this.prisma.tableSession.findFirst({
      where: {
        tableId: qrDetails.tableId,
        status: "OPEN"
      }
    });

    return {
      restaurant: {
        name: qrDetails.restaurantName,
        logoUrl: qrDetails.logoUrl,
        currency: qrDetails.currency,
        taxPercentage: qrDetails.taxPercentage,
      },
      branch: {
        id: qrDetails.branchId,
        name: qrDetails.branchName,
      },
      table: {
        id: qrDetails.tableId,
        tableName: qrDetails.tableName,
        tableNumber: qrDetails.tableNumber,
      },
      activeSession: activeSession ? {
        id: activeSession.id,
        sessionNumber: activeSession.sessionNumber,
        status: activeSession.status,
        totalAmount: Number(activeSession.totalAmount),
        openedAt: activeSession.openedAt,
      } : null,
      categories,
      addons
    };
  }

  async getTableSession(token: string) {
    const qrDetails = await this.validateToken(token);
    const activeSession = await this.prisma.tableSession.findFirst({
      where: {
        tableId: qrDetails.tableId,
        status: "OPEN"
      },
      include: {
        orders: {
          include: {
            orderItems: {
              include: {
                menuItem: true
              }
            }
          }
        }
      }
    });

    return activeSession;
  }


  async getCategories(token: string) {
    const { restaurantId } = await this.validateToken(token);
    return this.prisma.category.findMany({
      where: { restaurantId, isActive: true, deletedAt: null },
      orderBy: { displayOrder: "asc" }
    });
  }

  async getMenuItems(token: string, categoryId?: string) {
    const { restaurantId } = await this.validateToken(token);
    const where: any = { restaurantId, isAvailable: true, deletedAt: null };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    return this.prisma.menuItem.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: {
        images: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" } },
        variants: { where: { isAvailable: true }, orderBy: { displayOrder: "asc" } }
      }
    });
  }

  async getMenuItem(token: string, id: string) {
    const { restaurantId } = await this.validateToken(token);
    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId, isAvailable: true, deletedAt: null },
      include: {
        images: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" } },
        variants: { where: { isAvailable: true }, orderBy: { displayOrder: "asc" } }
      }
    });

    if (!item) {
      throw new NotFoundException(`Menu item not found`);
    }

    return item;
  }

  async validateCartInternal(restaurantId: string, items: CartItemDto[]) {
    let subtotal = 0;
    let validatedItems = [];

    // 1. Collect all unique IDs to execute bulk queries (bypassing N+1)
    const menuItemIds = Array.from(new Set(items.map(i => i.menuItemId)));
    const variantIds = Array.from(new Set(items.map(i => i.variantId).filter((id): id is string => !!id)));
    const addonIds = Array.from(new Set(items.flatMap(i => i.addonIds || []).filter((id): id is string => !!id)));

    // 2. Perform exactly 3 database queries in parallel (where applicable)
    const [menuItems, variants, addons] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, restaurantId, isAvailable: true, deletedAt: null }
      }),
      variantIds.length > 0
        ? this.prisma.variant.findMany({ where: { id: { in: variantIds }, isAvailable: true } })
        : Promise.resolve([]),
      addonIds.length > 0
        ? this.prisma.addon.findMany({ where: { id: { in: addonIds }, restaurantId, isActive: true } })
        : Promise.resolve([])
    ]);

    // 3. Map list inputs into O(1) in-memory hash maps
    const menuItemMap = new Map(menuItems.map(m => [m.id, m]));
    const variantMap = new Map(variants.map(v => [v.id, v]));
    const addonMap = new Map(addons.map(a => [a.id, a]));

    // 4. Validate and calculate cart items
    for (const item of items) {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        throw new BadRequestException(`Menu item ${item.menuItemId} is invalid, inactive or deleted`);
      }

      let baseUnitPrice = Number(menuItem.price);
      let variantName = null;

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.menuItemId !== item.menuItemId) {
          throw new BadRequestException(`Variant ${item.variantId} is invalid or unavailable for item ${menuItem.name}`);
        }
        baseUnitPrice = Number(variant.price);
        variantName = variant.name;
      }

      let unitPriceWithAddons = baseUnitPrice;
      let addonsList = [];
      if (item.addonIds && item.addonIds.length > 0) {
        for (const addonId of item.addonIds) {
          const addon = addonMap.get(addonId);
          if (!addon) {
            throw new BadRequestException(`One or more addons are invalid or inactive`);
          }
          unitPriceWithAddons += Number(addon.additionalPrice);
          addonsList.push({
            id: addon.id,
            name: addon.name,
            price: Number(addon.additionalPrice)
          });
        }
      }

      const itemSubtotal = unitPriceWithAddons * item.quantity;
      subtotal += itemSubtotal;

      validatedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: baseUnitPrice,
        unitPriceWithAddons,
        variantId: item.variantId,
        variantName,
        addons: addonsList,
        subtotal: itemSubtotal,
        notes: item.notes,
        taxPercentage: Number(menuItem.taxPercentage) || 0
      });
    }

    let totalTax = 0;
    for (const valItem of validatedItems) {
      const itemTax = valItem.subtotal * (valItem.taxPercentage / 100);
      totalTax += itemTax;
    }

    const grandTotal = subtotal + totalTax;

    return {
      items: validatedItems,
      subtotal,
      tax: totalTax,
      grandTotal
    };
  }

  async validateCart(token: string, dto: ValidateCartDto) {
    const { restaurantId } = await this.validateToken(token);
    return this.validateCartInternal(restaurantId, dto.items);
  }

  async createOrder(token: string, dto: CreateCustomerOrderDto) {
    const qrDetails = await this.validateToken(token);
    const { restaurantId, branchId, tableId } = qrDetails;

    const cartCalculation = await this.validateCartInternal(restaurantId, dto.items);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await this.prisma.order.count({
      where: { restaurantId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
    });
    const orderNumber = `ORD-${dateStr}-${(count + 1).toString().padStart(4, "0")}`;

    const phone = dto.customerPhone || `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const name = dto.customerName || "Guest";

    const customer = await this.prisma.customer.upsert({
      where: {
        restaurantId_phone: {
          restaurantId,
          phone
        }
      },
      update: {
        name,
        totalOrders: { increment: 1 },
        totalSpent: { increment: cartCalculation.grandTotal }
      },
      create: {
        restaurantId,
        name,
        phone,
        totalOrders: 1,
        totalSpent: cartCalculation.grandTotal
      }
    });

    const order = await this.prisma.$transaction(async (tx) => {
      // Find active open session on the table
      let activeSession = await tx.tableSession.findFirst({
        where: {
          tableId,
          status: "OPEN"
        }
      });

      if (!activeSession) {
        const sessionCount = await tx.tableSession.count({
          where: { restaurantId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
        });
        const sessionNumber = `SES-${dateStr}-${(sessionCount + 1).toString().padStart(4, "0")}`;

        activeSession = await tx.tableSession.create({
          data: {
            restaurantId,
            branchId,
            tableId,
            sessionNumber,
            status: "OPEN",
            totalAmount: 0.00
          }
        });
      }

      const newOrder = await tx.order.create({
        data: {
          restaurantId,
          branchId,
          tableId,
          customerId: customer.id,
          orderNumber,
          sessionId: activeSession.id,
          subtotal: cartCalculation.subtotal,
          tax: cartCalculation.tax,
          totalAmount: cartCalculation.grandTotal,
          notes: dto.notes,
          orderStatus: "PENDING",
          paymentStatus: "PENDING"
        }
      });

      for (const valItem of cartCalculation.items) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            menuItemId: valItem.menuItemId,
            quantity: valItem.quantity,
            unitPrice: valItem.unitPriceWithAddons,
            tax: valItem.unitPriceWithAddons * (valItem.taxPercentage / 100) * valItem.quantity,
            subtotal: valItem.subtotal,
            notes: valItem.notes
          }
        });

        if (valItem.variantId) {
          await tx.orderItemVariant.create({
            data: {
              orderItemId: orderItem.id,
              variantId: valItem.variantId,
              name: valItem.variantName,
              price: valItem.unitPrice
            }
          });
        }

        if (valItem.addons && valItem.addons.length > 0) {
          for (const addon of valItem.addons) {
            await tx.orderItemAddon.create({
              data: {
                orderItemId: orderItem.id,
                addonId: addon.id,
                name: addon.name,
                additionalPrice: addon.price
              }
            });
          }
        }
      }

      // Update consolidated total on active session
      await tx.tableSession.update({
        where: { id: activeSession.id },
        data: {
          totalAmount: { increment: cartCalculation.grandTotal }
        }
      });

      return newOrder;
    });

    return this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: {
            menuItem: {
              include: { images: true }
            },
            variants: true,
            addons: true
          }
        },
        table: true,
        branch: true,
        session: true,
        customer: true
      }
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            menuItem: {
              include: { images: true }
            },
            variants: true,
            addons: true
          }
        },
        table: true,
        branch: true,
        restaurant: true,
        session: true,
        customer: true
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }


  async getOrderStatus(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { orderStatus: true }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return { status: order.orderStatus };
  }
}
