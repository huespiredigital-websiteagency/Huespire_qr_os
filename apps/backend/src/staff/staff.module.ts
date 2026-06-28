import { Module } from "@nestjs/common";
import { StaffService } from "./staff.service";
import { StaffController } from "./staff.controller";
import { SubscriptionModule } from "../subscriptions/subscriptions.module";

@Module({
  imports: [SubscriptionModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
