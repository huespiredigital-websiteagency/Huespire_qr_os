import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsNotEmpty } from "class-validator";

export class UpgradeSubscriptionDto {
  @ApiProperty({
    description: "The unique identifier of the target plan",
    example: "9a2f646e-cf83-4e41-a1e6-819ab9e3b97b",
  })
  @IsUUID(4, { message: "Invalid plan identifier format" })
  @IsNotEmpty({ message: "Plan identifier is required" })
  planId!: string;
}
