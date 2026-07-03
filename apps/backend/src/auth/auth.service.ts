import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { generateSlug } from "@restaurant-os/utils";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
        where: { subdomain }
      });
      if (!existing) break;
      count++;
      subdomain = `${baseSubdomain}-${count}`;
    }

    // 3. Find OWNER role and ESSENTIAL plan
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
      where: { email: input.email }
    });
    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // 5. Hash password
    const passwordHash = await argon2.hash(input.password);

    // 6. Create Restaurant and Owner in transaction
    return this.prisma.$transaction(async (tx) => {
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
              taxPercentage: 0.00
            }
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
            }
          }
        }
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
          emailVerified: true,
        }
      });

      return { restaurant, user };
    });
  }

  async login(input: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      include: { role: true, restaurant: true }
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

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT payload
    const payload = {
      userId: user.id,
      restaurantId: user.restaurantId,
      role: user.role.code,
      email: user.email,
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
      }
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { role: true, restaurant: true }
    });
    if (!user) {
      throw new UnauthorizedException("User account no longer exists or has been deactivated.");
    }
    if (user.restaurant && (!user.restaurant.isActive || user.restaurant.deletedAt)) {
      throw new UnauthorizedException("Restaurant account has been suspended or deleted.");
    }
    return user;
  }
}
