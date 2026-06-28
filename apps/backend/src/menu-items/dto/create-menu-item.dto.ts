import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber, Min, MaxLength, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMenuItemDto {
  @ApiProperty({ example: "categoryId", description: "ID of the category this item belongs to" })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: "Margherita Pizza", description: "Name of the menu item" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "Classic tomato and cheese", description: "Item description" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: "https://example.com/image.png", description: "Image URL for the item" })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: "SKU123", description: "Stock Keeping Unit" })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: 12.99, description: "Price of the item" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 5, description: "Tax percentage for this item" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxPercentage?: number;

  @ApiPropertyOptional({ example: 15, description: "Preparation time in minutes" })
  @IsInt()
  @Min(0)
  @IsOptional()
  preparationTime?: number;

  @ApiPropertyOptional({ example: 250, description: "Calories count" })
  @IsInt()
  @Min(0)
  @IsOptional()
  calories?: number;

  @ApiPropertyOptional({ example: true, description: "Is this item vegetarian?" })
  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @ApiPropertyOptional({ example: false, description: "Is this item vegan?" })
  @IsBoolean()
  @IsOptional()
  isVegan?: boolean;

  @ApiPropertyOptional({ example: false, description: "Is this item spicy?" })
  @IsBoolean()
  @IsOptional()
  isSpicy?: boolean;

  @ApiPropertyOptional({ example: true, description: "Is this item available for ordering?" })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 1, description: "Order in which this item appears" })
  @IsInt()
  @Min(1)
  @IsOptional()
  displayOrder?: number;
}
