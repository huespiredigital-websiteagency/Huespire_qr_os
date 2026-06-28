import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum } from "class-validator";

export enum StaffRoleCode {
  MANAGER = "MANAGER",
  KITCHEN = "KITCHEN",
  WAITER = "WAITER",
  CASHIER = "CASHIER",
}

export class InviteStaffDto {
  @ApiProperty({ description: "Staff Email address", example: "waiter1@pizza.com" })
  @IsEmail({}, { message: "Invalid email format" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @ApiProperty({ description: "Staff First Name", example: "John" })
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  firstName!: string;

  @ApiProperty({ description: "Staff Last Name", example: "Doe", required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: "Staff Phone number", example: "9876543210", required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: "Staff Role Code", enum: StaffRoleCode, example: StaffRoleCode.WAITER })
  @IsEnum(StaffRoleCode, { message: "Role must be one of: MANAGER, KITCHEN, WAITER, CASHIER" })
  roleCode!: StaffRoleCode;
}
