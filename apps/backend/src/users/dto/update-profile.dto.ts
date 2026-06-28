import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({ description: "First Name", example: "John", required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "First name cannot be empty" })
  firstName?: string;

  @ApiProperty({ description: "Last Name", example: "Doe", required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: "Phone number", example: "9876543210", required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: "Avatar Image URL", example: "https://example.com/avatar.png", required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
