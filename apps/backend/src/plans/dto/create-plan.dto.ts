import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, IsBoolean, Min, MinLength, MaxLength } from "class-validator";

export class CreatePlanDto {
  @ApiProperty({ description: "Plan Name", example: "Starter" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "Unique Plan Code", example: "STARTER" })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiProperty({ description: "Plan Description", example: "Basic plan for small restaurants", required: false })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "One-time Setup Fee", example: 18000.00 })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  setupFee: number;

  @ApiProperty({ description: "Monthly Price", example: 1000.00 })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({ description: "Maximum Tables allowed", example: 20 })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  maxTables: number;

  @ApiProperty({ description: "Maximum Branches allowed", example: 1 })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  maxBranches: number;

  @ApiProperty({ description: "Maximum Staff Accounts allowed", example: 5 })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  maxStaff: number;

  @ApiProperty({ description: "Monthly Email limit", example: 1000 })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  monthlyEmailLimit: number;

  @ApiProperty({ description: "Custom Domain Support enabled", example: false, required: false })
  @IsOptional()
  @IsBoolean()
  customDomain?: boolean;

  @ApiProperty({ description: "Analytics Module enabled", example: true, required: false })
  @IsOptional()
  @IsBoolean()
  analyticsEnabled?: boolean;

  @ApiProperty({ description: "Priority Support enabled", example: false, required: false })
  @IsOptional()
  @IsBoolean()
  prioritySupport?: boolean;
}