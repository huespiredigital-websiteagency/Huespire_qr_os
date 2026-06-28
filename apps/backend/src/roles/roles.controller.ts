import { Controller, Get, UseGuards } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("roles")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: "Get all available operational roles" })
  @ApiResponse({ status: 200, description: "Roles retrieved successfully" })
  async findAll() {
    const roles = await this.rolesService.findAll();
    return {
      success: true,
      message: "Roles retrieved successfully",
      data: roles,
    };
  }
}
