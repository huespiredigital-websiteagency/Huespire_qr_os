import { IsOptional, IsString, IsEnum } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class FilterKitchenOrdersDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @IsOptional()
  @IsString()
  sortBy?: "newest" | "oldest" | "longest_waiting";
}
