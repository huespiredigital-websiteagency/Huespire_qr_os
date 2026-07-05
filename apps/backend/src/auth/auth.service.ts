import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { generateSlug } from "@restaurant-os/utils";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../email/email.service";
import {
  getOwnerVerifyEmailTemplate,
  getOwnerPasswordResetTemplate,
} from "../email/email-templates";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  async register(input: RegisterDto) {
    // 1. Split name into first and last name
    const nameParts = input.name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    // 2. Generate unique subdomain based on name
    const baseSubdomain = generateSlug(input.name);
    let subdomain = baseSubdomain;
    let count = 0;
    while (true) {
      const existing = await this.prisma.restaurant.findUnique({
        where: { subdomain },
      });
      if (!existing) break;
      count++;
      subdomain = `${baseSubdomain}-${count}`;
    }

    // 3. Find OWNER role and STARTER plan
    const ownerRole = await this.prisma.role.findUnique({ where: { code: "OWNER" } });
    if (!ownerRole) {
      throw new NotFoundException("OWNER role not found");
    }
    const plan = await this.prisma.plan.findUnique({ where: { code: "STARTER" } });
    if (!plan) {
      throw new NotFoundException("STARTER plan not found");
    }

    // 4. Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: input.email },
    });
    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // 5. Hash password
    const passwordHash = await argon2.hash(input.password);

    // 6. Create Restaurant and Owner in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: `${input.name}'s Kitchen`,
          slug: subdomain,
          email: input.email,
          phone: "9999999999",
          subdomain,
          isActive: true,
          emailVerified: false,
          settings: {
            create: {
              timezone: "Asia/Kolkata",
              currency: "INR",
              taxPercentage: 0.0,
            },
          },
          subscription: {
            create: {
              planId: plan.id,
              status: "ACTIVE",
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              monthlyPrice: plan.monthlyPrice,
              setupFee: plan.setupFee,
              maxTables: plan.maxTables,
              monthlyEmailLimit: plan.monthlyEmailLimit,
            },
          },
        },
      });

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          roleId: ownerRole.id,
          firstName,
          lastName,
          email: input.email,
          passwordHash,
          isActive: true,
          emailVerified: false, // Owners must verify their email address
        },
      });

      return { restaurant, user };
    });

    // 7. Send Owner Verification Email
    await this.sendVerificationEmail(result.user.id);

    return result;
  }

  async login(input: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      include: { role: true, restaurant: true },
    });

    if (!user) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Your account has been disabled.");
    }

    if (user.restaurant && !user.restaurant.isActive) {
      throw new UnauthorizedException("Restaurant access is currently unavailable.");
    }

    // Email verification requirement bypassed as requested
    /*
    if (user.role.code === "OWNER" && !user.emailVerified) {
      throw new UnauthorizedException("Your email address must be verified before you can access the dashboard.");
    }
    */

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT payload
    const payload = {
      userId: user.id,
      restaurantId: user.restaurantId,
      role: user.role.code,
      email: user.email,
      id: user.id,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.code,
        restaurantId: user.restaurantId,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { role: true, restaurant: true },
    });
    if (!user) {
      throw new UnauthorizedException("User account no longer exists or has been deactivated.");
    }
    if (user.restaurant && (!user.restaurant.isActive || user.restaurant.deletedAt)) {
      throw new UnauthorizedException("Restaurant account has been suspended or deleted.");
    }
    return user;
  }

  /**
   * Generates a secure email verification token and triggers the SES email send.
   */
  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { restaurant: true, role: true },
    });

    if (!user || user.role.code !== "OWNER") {
      return;
    }

    // Generate secure 32-byte token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store in database
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const appUrl = this.configService.get<string>("APP_URL") || "http://localhost:3000";
    const verifyLink = `${appUrl}/verify-email?token=${token}`;

    const branding = {
      name: user.restaurant?.name || "Restaurant OS",
      logoUrl: user.restaurant?.logoUrl || undefined,
      primaryColor: "#6366f1",
      secondaryColor: "#10b981",
    };

    const html = getOwnerVerifyEmailTemplate(
      `${user.firstName} ${user.lastName || ""}`,
      verifyLink,
      branding
    );

    await this.emailService.sendEmail(
      user.email,
      "Verify Your Email Address",
      html,
      user.restaurantId || undefined
    );
  }

  /**
   * Resends verification email
   */
  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { role: true },
    });

    if (!user || user.role.code !== "OWNER") {
      throw new BadRequestException("Owner account with this email does not exist.");
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email is already verified.");
    }

    // Delete any old tokens first
    await this.prisma.verificationToken.deleteMany({
      where: { userId: user.id },
    });

    await this.sendVerificationEmail(user.id);
    return true;
  }

  /**
   * Verifies an email token and marks the owner as verified
   */
  async verifyEmail(token: string): Promise<boolean> {
    const verifyToken = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verifyToken) {
      throw new BadRequestException("Invalid verification token.");
    }

    if (new Date() > verifyToken.expiresAt) {
      await this.prisma.verificationToken.delete({ where: { id: verifyToken.id } });
      throw new BadRequestException("Verification token has expired.");
    }

    // Mark verified
    await this.prisma.user.update({
      where: { id: verifyToken.userId || undefined },
      data: { emailVerified: true },
    });

    // Delete token
    await this.prisma.verificationToken.delete({
      where: { id: verifyToken.id },
    });

    return true;
  }

  /**
   * Generates a password reset token and sends an email
   */
  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { role: true, restaurant: true },
    });

    // Allowed only for OWNER and SUPER_ADMIN roles
    if (!user || (user.role.code !== "OWNER" && user.role.code !== "SUPER_ADMIN")) {
      // Return true silently for security (avoid email enumeration attacks)
      return true;
    }

    // Generate secure reset token expiring in 30 minutes
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Delete existing reset tokens
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Save token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const appUrl = this.configService.get<string>("APP_URL") || "http://localhost:3000";
    // Check if it is a super admin reset link or standard tenant reset link
    const resetLink = user.role.code === "SUPER_ADMIN"
      ? `${appUrl}/admin/reset-password?token=${token}`
      : `${appUrl}/reset-password?token=${token}`;

    const branding = {
      name: user.restaurant?.name || "Restaurant OS Support",
      logoUrl: user.restaurant?.logoUrl || undefined,
      primaryColor: "#6366f1",
      secondaryColor: "#10b981",
    };

    const html = getOwnerPasswordResetTemplate(
      `${user.firstName} ${user.lastName || ""}`,
      resetLink,
      branding
    );

    await this.emailService.sendEmail(
      user.email,
      "Password Reset Request",
      html,
      user.restaurantId || undefined
    );

    return true;
  }

  /**
   * Reset user password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException("Invalid reset token.");
    }

    if (new Date() > resetToken.expiresAt) {
      await this.prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      throw new BadRequestException("Reset token has expired.");
    }

    // Hash password
    const passwordHash = await argon2.hash(newPassword);

    // Update user
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Delete token
    await this.prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return true;
  }
}
