import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, Matches, IsNumber, Min, Max, IsEmail, MinLength } from "class-validator";

export class CreateBranchDto {
  @ApiProperty({ description: "Branch Name", example: "Indiranagar Branch" })
  @IsString()
  @MinLength(2, { message: "Branch name must be at least 2 characters long" })
  name!: string;

  @ApiProperty({ description: "Unique Branch Code within the restaurant", example: "BLR001" })
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/, { message: "Branch code must contain uppercase letters, numbers, hyphens, or underscores" })
  code!: string;

  @ApiProperty({ description: "Branch Contact Phone number", example: "9876543210", required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: "Branch Contact Email address", example: "blr001@pizza.com", required: false })
  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  email?: string;

  @ApiProperty({ description: "Physical Street Address", example: "123 Main St" })
  @IsString()
  @MinLength(5, { message: "Address must be at least 5 characters long" })
  address!: string;

  @ApiProperty({ description: "City", example: "Bengaluru" })
  @IsString()
  @IsNotEmpty({ message: "City is required" })
  city!: string;

  @ApiProperty({ description: "State", example: "Karnataka" })
  @IsString()
  @IsNotEmpty({ message: "State is required" })
  state!: string;

  @ApiProperty({ description: "Country", example: "India" })
  @IsString()
  @IsNotEmpty({ message: "Country is required" })
  country!: string;

  @ApiProperty({ description: "Postal/ZIP Code", example: "560001", required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ description: "GPS Latitude", example: 12.9716, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ description: "GPS Longitude", example: 77.5946, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ description: "Branch Opening Time in HH:MM format", example: "09:00" })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Opening time must be in HH:MM format" })
  openingTime!: string;

  @ApiProperty({ description: "Branch Closing Time in HH:MM format", example: "22:00" })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Closing time must be in HH:MM format" })
  closingTime!: string;
}
