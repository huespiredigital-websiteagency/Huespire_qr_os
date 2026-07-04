import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new restaurant owner account" })
  @ApiResponse({ status: 201, description: "Restaurant onboarded successfully" })
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body);
    return {
      success: true,
      message: "Restaurant onboarded successfully",
      data: result,
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login user and generate JWT token" })
  @ApiResponse({ status: 200, description: "Login successful" })
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body);
    return {
      success: true,
      message: "Login successful",
      data: result,
    };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify restaurant owner email address" })
  async verifyEmail(@Body() body: { token: string }) {
    await this.authService.verifyEmail(body.token);
    return {
      success: true,
      message: "Email address verified successfully.",
    };
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend email verification link to owner" })
  async resendVerification(@Body() body: { email: string }) {
    await this.authService.resendVerificationEmail(body.email);
    return {
      success: true,
      message: "Verification email sent successfully.",
    };
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a password reset email" })
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    return {
      success: true,
      message: "If the email is registered, a password reset link has been sent.",
    };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password using reset token" })
  async resetPassword(@Body() body: { token: string; password: string }) {
    // In JavaScript/TypeScript we read body.password as the new password
    await this.authService.resetPassword(body.token, body.password);
    return {
      success: true,
      message: "Password reset successfully. You can now log in.",
    };
  }

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getProfile(@CurrentUser() user: any) {
    const userProfile = await this.authService.validateUser(user.userId);
    return {
      success: true,
      message: "Profile retrieved successfully",
      data: {
        id: userProfile.id,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        role: userProfile.role.code,
        restaurantId: userProfile.restaurantId,
      },
    };
  }
}
