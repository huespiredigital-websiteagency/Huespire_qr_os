import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ example: "Starters", description: "Name of the category" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "Appetizers to start your meal", description: "Category description" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: "https://example.com/image.png", description: "Image URL for the category" })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 1, description: "Order in which this category appears on the menu" })
  @IsInt()
  @Min(1)
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, description: "Whether the category is active and visible" })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
