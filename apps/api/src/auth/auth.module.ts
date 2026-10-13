import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeviceEntity, EmployeeEntity, RefreshSessionEntity } from "../database/entities.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AccessTokenGuard, RoleGuard } from "./auth.guards.js";
import { WebAuthnService } from "./webauthn.service.js";
import { OidcService } from "./oidc.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeEntity, DeviceEntity, RefreshSessionEntity]), JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.get("JWT_ACCESS_SECRET", "development-only-change-me-development-only"), signOptions: { issuer: "kontur-api", audience: "kontur-clients" }, verifyOptions: { issuer: "kontur-api", audience: "kontur-clients" } }) })],
  controllers: [AuthController], providers: [AuthService, WebAuthnService, OidcService, AccessTokenGuard, RoleGuard], exports: [AuthService, JwtModule, AccessTokenGuard, RoleGuard]
})
export class AuthModule {}
