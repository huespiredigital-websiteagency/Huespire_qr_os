import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber, Min, MaxLength, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateVariantDto {
  @ApiProperty({ example: "menuItemId", description: "ID of the menu item this variant belongs to" })
  @IsUUID()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ example: "Large", description: "Name of the variant" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 2.50, description: "Price adjustment or override for this variant" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 5, description: "Additional or total preparation time in minutes" })
  @IsInt()
  @Min(0)
  @IsOptional()
  preparationTime?: number;

  @ApiPropertyOptional({ example: true, description: "Is this variant available?" })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 1, description: "Display order" })
  @IsInt()
  @Min(1)
  @IsOptional()
  displayOrder?: number;
}
