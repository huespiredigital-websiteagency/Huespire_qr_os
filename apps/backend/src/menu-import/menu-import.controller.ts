import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Res,
  HttpStatus,
  BadRequestException
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { MenuImportService } from "./menu-import.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger";
import { ValidateImportQueryDto, ExecuteImportQueryDto, ImportMode } from "./dto/menu-import.dto";

@ApiTags("menu-import")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("menu-import")
export class MenuImportController {
  constructor(private readonly importService: MenuImportService) {}

  @Get("templates/:type")
  @Roles("OWNER", "MANAGER")
  @ApiOperation({ summary: "Download CSV or Excel template for menu import" })
  async getTemplate(
    @Param("type") type: string,
    @Res() res: Response
  ) {
    const buffer = await this.importService.generateTemplate(type);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=menu_template_${type}.xlsx`
    );
    res.status(HttpStatus.OK).send(buffer);
  }

  @Post("validate")
  @Roles("OWNER", "MANAGER")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Validate menu import spreadsheet" })
  async validateFile(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ValidateImportQueryDto
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    const isCsv = file.originalname.endsWith(".csv");
    const parsedData = await this.importService.parseFile(file.buffer, isCsv, query.type);
    const result = await this.importService.validate(user.restaurantId, parsedData);

    return {
      success: true,
      message: "File parsed and validated successfully",
      data: {
        errors: result.errors,
        preview: result.preview,
        parsedCount: {
          categories: parsedData.categories.length,
          menuItems: parsedData.menuItems.length,
          variants: parsedData.variants.length,
          addons: parsedData.addons.length
        }
      }
    };
  }

  @Post("import")
  @Roles("OWNER", "MANAGER")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Execute bulk menu import with strict or partial mode" })
  async importFile(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ExecuteImportQueryDto
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    const isCsv = file.originalname.endsWith(".csv");
    const parsedData = await this.importService.parseFile(file.buffer, isCsv, query.type);
    
    const mode = query.mode || ImportMode.STRICT;
    const result = await this.importService.executeImport(user.restaurantId, parsedData, mode);
    return {
      success: true,
      message: mode === ImportMode.STRICT ? "Menu imported successfully in Strict Mode." : "Menu imported successfully with valid rows.",
      data: result
    };
  }

  @Post("error-report")
  @Roles("OWNER", "MANAGER")
  @ApiOperation({ summary: "Generate downloadable Excel error report from structured errors" })
  async generateErrorReport(
    @Body("errors") errors: any[],
    @Res() res: Response
  ) {
    if (!errors || !Array.isArray(errors)) {
      throw new BadRequestException("Errors array is required");
    }
    const buffer = await this.importService.generateErrorReport(errors);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ImportErrors.xlsx`
    );
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get("export")
  @Roles("OWNER", "MANAGER")
  @ApiOperation({ summary: "Export active menu items to Excel" })
  async exportMenu(
    @CurrentUser() user: any,
    @Res() res: Response
  ) {
    const buffer = await this.importService.exportMenu(user.restaurantId);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=menu_export_${user.restaurantId}.xlsx`
    );
    res.status(HttpStatus.OK).send(buffer);
  }
}
