import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class UpdatePasswordDto {
  @ApiProperty({ description: "Current Password", example: "Password123!" })
  @IsString()
  @IsNotEmpty({ message: "Current password is required" })
  currentPassword!: string;

  @ApiProperty({ description: "New Password", example: "NewPassword123!" })
  @IsString()
  @IsNotEmpty({ message: "New password is required" })
  @MinLength(8, { message: "New password must be at least 8 characters long" })
  newPassword!: string;
}
