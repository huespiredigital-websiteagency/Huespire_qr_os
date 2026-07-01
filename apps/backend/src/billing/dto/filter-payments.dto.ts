import { IsOptional, IsString, IsEnum } from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class FilterPaymentsQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  cashierId?: string;

}
