import { Controller, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe, ParseBoolPipe, Body } from "@nestjs/common";
import { MenuImagesService } from "./menu-images.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("menu-images")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("menu-images")
export class MenuImagesController {
  constructor(private readonly menuImagesService: MenuImagesService) {}

  @Post(":menuItemId")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Upload an image for a menu item" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        isPrimary: {
          type: 'boolean',
          default: false,
        }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser() user: any,
    @Param("menuItemId", ParseUUIDPipe) menuItemId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("isPrimary") isPrimaryStr?: string
  ) {
    const isPrimary = isPrimaryStr === 'true';
    const image = await this.menuImagesService.uploadImage(user.restaurantId, menuItemId, file, isPrimary);
    
    return {
      success: true,
      message: "Image uploaded successfully",
      data: image,
    };
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Delete a menu item image" })
  async remove(@CurrentUser() user: any, @Param("id", ParseUUIDPipe) id: string) {
    const result = await this.menuImagesService.removeImage(user.restaurantId, id);
    return {
      success: true,
      message: "Image deleted successfully",
      data: result,
    };
  }
}
