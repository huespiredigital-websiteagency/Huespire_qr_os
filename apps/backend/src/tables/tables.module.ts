import { Module } from "@nestjs/common";
import { TablesService } from "./tables.service";
import { TablesController } from "./tables.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SubscriptionModule } from "../subscriptions/subscriptions.module";
import { QRModule } from "../qr/qr.module";

@Module({
  imports: [PrismaModule, SubscriptionModule, QRModule],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
