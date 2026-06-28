import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsDecimal, IsNumber, IsBoolean, Min, Max, IsEmail } from "class-validator";

export class UpdateRestaurantDto {
  @ApiProperty({ description: "Restaurant Name", example: "Pizza Palace", required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "Contact Email address", example: "contact@pizzapalace.com", required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: "Contact Phone number", example: "9876543210", required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: "Street Address", example: "123 Main St", required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: "City name", example: "Bengaluru", required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: "State/Region name", example: "Karnataka", required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: "Country name", example: "India", required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: "Postal/ZIP Code", example: "560001", required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ description: "Logo URL", example: "https://example.com/logo.png", required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ description: "Cover Image URL", example: "https://example.com/cover.png", required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ description: "Custom Domain name", example: "menu.pizzapalace.com", required: false })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiProperty({ description: "Timezone", example: "Asia/Kolkata", required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: "Currency symbol or code", example: "INR", required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: "Tax percentage rate", example: 5.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercentage?: number;
}
