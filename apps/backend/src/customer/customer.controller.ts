import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { ValidateCartDto } from "./dto/validate-cart.dto";
import { CreateCustomerOrderDto } from "./dto/create-customer-order.dto";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";

@ApiTags("customer")
@Controller("customer")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get("menu")
  @ApiOperation({ summary: "Get customer menu including categories, items, and restaurant branding scoped by QR Token" })
  @ApiQuery({ name: "token", description: "QR validation token" })
  async getMenu(@Query("token") token: string) {
    return {
      success: true,
      data: await this.customerService.getMenu(token),
    };
  }

  @Get("table-session")
  @ApiOperation({ summary: "Get current active table session (open bill) details" })
  @ApiQuery({ name: "token", description: "QR validation token" })
  async getTableSession(@Query("token") token: string) {
    return {
      success: true,
      data: await this.customerService.getTableSession(token),
    };
  }

  @Get("categories")
  @ApiOperation({ summary: "Get categories scoped by QR Token" })
  @ApiQuery({ name: "token", description: "QR validation token" })
  async getCategories(@Query("token") token: string) {
    return {
      success: true,
      data: await this.customerService.getCategories(token),
    };
  }

  @Get("menu-items")
  @ApiOperation({ summary: "Get menu items scoped by QR Token, optionally filtered by category" })
  @ApiQuery({ name: "token", description: "QR validation token" })
  @ApiQuery({ name: "categoryId", required: false, description: "Category UUID" })
  async getMenuItems(@Query("token") token: string, @Query("categoryId") categoryId?: string) {
    return {
      success: true,
      data: await this.customerService.getMenuItems(token, categoryId),
    };
  }

  @Get("menu-items/:id")
  @ApiOperation({ summary: "Get details of a single menu item" })
  @ApiQuery({ name: "token", description: "QR validation token" })
  async getMenuItem(@Query("token") token: string, @Param("id", ParseUUIDPipe) id: string) {
    return {
      success: true,
      data: await this.customerService.getMenuItem(token, id),
    };
  }

  @Post("cart/validate")
  @ApiOperation({ summary: "Validate shopping cart prices and items" })
  @ApiQuery({ name: "token", description: "QR validation token" })
  async validateCart(@Query("token") token: string, @Body() dto: ValidateCartDto) {
    return {
      success: true,
      data: await this.customerService.validateCart(token, dto),
    };
  }

  @Post("orders")
  @ApiOperation({ summary: "Place a customer order" })
  @ApiQuery({ name: "token", description: "QR validation token" })
  async createOrder(@Query("token") token: string, @Body() dto: CreateCustomerOrderDto) {
    return {
      success: true,
      message: "Order placed successfully",
      data: await this.customerService.createOrder(token, dto),
    };
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "Get customer order details for tracking" })
  async getOrder(@Param("id", ParseUUIDPipe) id: string) {
    return {
      success: true,
      data: await this.customerService.getOrder(id),
    };
  }

  @Get("orders/:id/status")
  @ApiOperation({ summary: "Get customer order status only" })
  async getOrderStatus(@Param("id", ParseUUIDPipe) id: string) {
    return {
      success: true,
      data: await this.customerService.getOrderStatus(id),
    };
  }
}
