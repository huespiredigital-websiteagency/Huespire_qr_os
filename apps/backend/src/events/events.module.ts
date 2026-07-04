import { Module, Global } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PrismaModule } from "../prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [EventsGateway, NotificationsService],
  exports: [EventsGateway, NotificationsService]
})
export class EventsModule {}
