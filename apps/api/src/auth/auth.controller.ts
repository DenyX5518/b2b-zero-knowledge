import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "./auth.decorators.js";
import { LoginDto, PasskeyEmailDto, RefreshDto } from "./auth.dto.js";
import { AuthService } from "./auth.service.js";
import { WebAuthnService } from "./webauthn.service.js";
import { OidcService } from "./oidc.service.js";
import { RedisService } from "../infrastructure/redis.service.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly webauthn: WebAuthnService, private readonly oidc: OidcService, private readonly redis: RedisService) {}
  @Public() @Post("login") @HttpCode(200) async login(@Req() request: Request, @Body() input: LoginDto) {
    const key = `login-limit:${request.ip}:${input.email.toLowerCase()}`;
    const limit = await this.redis.consumeLimit(key, 7, 300);
    if (!limit.allowed) throw new HttpException("Too many login attempts", HttpStatus.TOO_MANY_REQUESTS);
    const result = await this.auth.login(input);
    await this.redis.clear(key);
    return result;
  }
  @Public() @Post("refresh") @HttpCode(200) refresh(@Body() input: RefreshDto) { return this.auth.rotateRefreshToken(input.refreshToken); }
  @Public() @Post("logout") @HttpCode(204) async logout(@Body() input: RefreshDto) { await this.auth.revokeFamily(input.refreshToken); }

  @Public() @Post("webauthn/register/options") async registrationOptions(@Req() req: Request) { const claims = await this.enrollmentClaims(req); return this.webauthn.registrationOptions(claims.sub, claims.tenantId, claims.deviceId); }
  @Public() @Post("webauthn/register/verify") async verifyRegistration(@Req() req: Request, @Body() body: any) { const claims = await this.enrollmentClaims(req); return this.webauthn.verifyRegistration(claims.sub, claims.tenantId, claims.deviceId, body.response); }
  @Public() @Post("webauthn/authenticate/options") authenticationOptions(@Body() body: PasskeyEmailDto) { return this.webauthn.authenticationOptions(body.email); }
  @Public() @Post("webauthn/authenticate/verify") verifyAuthentication(@Body() body: any) { return this.webauthn.verifyAuthentication(body.challenge, body.response); }
  @Public() @Get("oidc/start") async oidcStart(@Query("deviceId") deviceId: string, @Query("deviceName") deviceName: string) { return { authorizationUrl: await this.oidc.start(deviceId, deviceName) }; }
  @Public() @Get("oidc/callback") oidcCallback(@Query() query: Record<string, string>) { return this.oidc.callback(query); }

  private enrollmentClaims(request: Request) {
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException("Missing enrollment token");
    return this.auth.verifyEnrollmentToken(token);
  }
}
