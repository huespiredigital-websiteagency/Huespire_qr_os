import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, MaxLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CartItemDto } from "./validate-cart.dto";

export class CreateCustomerOrderDto {
  @ApiPropertyOptional({ example: "John Doe", description: "Customer name" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerName?: string;

  @ApiPropertyOptional({ example: "1234567890", description: "Customer phone number" })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional({ example: "Extra napkins please", description: "General order notes" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ type: [CartItemDto], description: "List of items to order" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
