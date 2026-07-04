import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, Min } from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}
