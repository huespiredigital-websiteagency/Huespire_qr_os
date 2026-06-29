import { Module } from "@nestjs/common";
import { MenuImportService } from "./menu-import.service";
import { MenuImportController } from "./menu-import.controller";

@Module({
  controllers: [MenuImportController],
  providers: [MenuImportService],
  exports: [MenuImportService],
})
export class MenuImportModule {}
