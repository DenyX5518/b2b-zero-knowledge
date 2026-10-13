import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { EntityStatus, type EmployeeRole } from "../database/entities.js";
import { PUBLIC_ROUTE, REQUIRED_ROLES } from "./auth.decorators.js";
import type { AccessClaims } from "./auth.types.js";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") return true;
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException("Missing access token");
    try {
      const claims = await this.jwt.verifyAsync<AccessClaims>(token);
      if (claims.type !== "access" || !claims.tenantId || !claims.deviceId) throw new Error("Invalid claims");
      request.user = claims;
      return true;
    } catch { throw new UnauthorizedException("Invalid or expired access token"); }
  }
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;
    const roles = this.reflector.getAllAndOverride<EmployeeRole[]>(REQUIRED_ROLES, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest().user as AccessClaims | undefined;
    if (!user || !roles.includes(user.role)) throw new ForbiddenException("Policy denied this action");
    return true;
  }
}
