import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsOptional, Min, IsEnum, IsBoolean } from "class-validator";
import { TableStatus } from "@prisma/client";

export class UpdateTableDto {
  @ApiProperty({ description: "Table Display Name", example: "Table 1", required: false })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiProperty({ description: "Seating Capacity", example: 4, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  seatingCapacity?: number;

  @ApiProperty({ description: "Table Active Status", example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: "Table Dining Status", enum: TableStatus, example: "AVAILABLE", required: false })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiProperty({ description: "Table Notes", example: "Window seat", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
