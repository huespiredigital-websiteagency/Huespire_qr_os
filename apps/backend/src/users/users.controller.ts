import { Controller, Patch, Put, Body, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("users")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch("profile")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update current user profile info" })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  async updateProfile(@CurrentUser() user: any, @Body() body: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.userId, body);
    return {
      success: true,
      message: "Profile updated successfully",
      data: updated,
    };
  }

  @Put("password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update current user password" })
  @ApiResponse({ status: 200, description: "Password updated successfully" })
  async updatePassword(@CurrentUser() user: any, @Body() body: UpdatePasswordDto) {
    return this.usersService.updatePassword(user.userId, body);
  }
}
