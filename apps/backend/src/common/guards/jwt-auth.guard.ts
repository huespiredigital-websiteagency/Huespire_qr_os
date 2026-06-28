import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (isPublic) {
      if (token) {
        try {
          const secret = this.configService.get<string>("JWT_SECRET");
          const payload = await this.jwtService.verifyAsync(token, { secret });
          request["user"] = payload;
        } catch {}
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException("Missing authentication token");
    }

    try {
      const secret = this.configService.get<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      // Attach user payload (contains userId, restaurantId, role) to the request
      request["user"] = payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired authentication token");
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
