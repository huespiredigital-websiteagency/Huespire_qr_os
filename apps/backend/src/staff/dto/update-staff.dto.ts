import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum, IsBoolean } from "class-validator";
import { StaffRoleCode } from "./invite-staff.dto";

export class UpdateStaffDto {
  @ApiProperty({ description: "Staff First Name", example: "John", required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: "Staff Last Name", example: "Doe", required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: "Staff Phone number", example: "9876543210", required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: "Staff Role Code", enum: StaffRoleCode, example: StaffRoleCode.WAITER, required: false })
  @IsOptional()
  @IsEnum(StaffRoleCode, { message: "Role must be one of: MANAGER, KITCHEN, WAITER, CASHIER" })
  roleCode?: StaffRoleCode;

  @ApiProperty({ description: "Staff active status", example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
