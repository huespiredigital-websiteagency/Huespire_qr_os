import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailService } from "./email.service";
import { EmailLogController } from "./email-log.controller";

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [EmailLogController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
