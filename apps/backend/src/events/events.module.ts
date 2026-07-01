import { Module, Global } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { NotificationsController } from "./notifications.controller";

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [EventsGateway],
  exports: [EventsGateway]
})
export class EventsModule {}
