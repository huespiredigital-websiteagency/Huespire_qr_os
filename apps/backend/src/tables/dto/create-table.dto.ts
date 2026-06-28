import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsOptional, Min, IsUUID } from "class-validator";

export class CreateTableDto {
  @ApiProperty({ description: "Table Display Name", example: "Table 1" })
  @IsString()
  tableName: string;

  @ApiProperty({ description: "Table Number", example: 1 })
  @IsInt()
  @Min(1)
  tableNumber: number;

  @ApiProperty({ description: "Assigned Branch ID", example: "uuid" })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: "Seating Capacity", example: 4, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  seatingCapacity?: number;

  @ApiProperty({ description: "Table Notes", example: "Window seat", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
