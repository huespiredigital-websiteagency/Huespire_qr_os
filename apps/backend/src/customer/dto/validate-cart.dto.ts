import { IsString, IsNotEmpty, IsArray, ValidateNested, IsUUID, IsInt, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CartItemDto {
  @ApiProperty({ example: "menu-item-uuid", description: "ID of the menu item" })
  @IsUUID()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ example: 2, description: "Quantity of the item" })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: "variant-uuid", description: "ID of the selected variant" })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiPropertyOptional({ example: ["addon-uuid-1", "addon-uuid-2"], description: "IDs of chosen addons" })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  addonIds?: string[];

  @ApiPropertyOptional({ example: "No onions", description: "Customer notes for the item" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ValidateCartDto {
  @ApiProperty({ type: [CartItemDto], description: "List of items in the cart" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
