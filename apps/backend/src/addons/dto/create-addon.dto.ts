import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber, Min, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAddonDto {
  @ApiProperty({ example: "Extra Cheese", description: "Name of the add-on" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "Extra mozzarella cheese", description: "Description of the add-on" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ example: 1.50, description: "Additional price for this add-on" })
  @IsNumber()
  @Min(0)
  additionalPrice: number;

  @ApiPropertyOptional({ example: true, description: "Is this add-on active?" })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, description: "Display order" })
  @IsInt()
  @Min(1)
  @IsOptional()
  displayOrder?: number;
}
