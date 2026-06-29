import { Module } from "@nestjs/common";
import { WaiterController } from "./waiter.controller";
import { WaiterService } from "./waiter.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [WaiterController],
  providers: [WaiterService],
  exports: [WaiterService]
})
export class WaiterModule {}
