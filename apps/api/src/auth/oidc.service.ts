import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeviceEntity, EmployeeEntity, EntityStatus } from "../database/entities.js";
import { RedisService } from "../infrastructure/redis.service.js";
import { AuthService } from "./auth.service.js";

@Injectable()
export class OidcService {
  private configuration: any;
  constructor(private readonly config: ConfigService, private readonly redis: RedisService, private readonly auth: AuthService, @InjectRepository(EmployeeEntity) private readonly employees: Repository<EmployeeEntity>, @InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>) {}

  private async client(): Promise<{ oidc: any; configuration: any }> {
    if (!this.config.get("OIDC_ISSUER") || !this.config.get("OIDC_CLIENT_ID")) throw new UnauthorizedException("Organization SSO is not configured");
    const oidc: any = await import("openid-client");
    this.configuration ??= await oidc.discovery(new URL(this.config.get("OIDC_ISSUER")!), this.config.get("OIDC_CLIENT_ID")!, this.config.get("OIDC_CLIENT_SECRET") || undefined);
    return { oidc, configuration: this.configuration };
  }

  async start(deviceId: string, deviceName: string): Promise<string> {
    const { oidc, configuration } = await this.client();
    const verifier = oidc.randomPKCECodeVerifier();
    const challenge = await oidc.calculatePKCECodeChallenge(verifier);
    const state = oidc.randomState();
    await this.redis.setJson(`oidc:${state}`, { verifier, deviceId, deviceName }, 300);
    return oidc.buildAuthorizationUrl(configuration, { redirect_uri: this.config.get("OIDC_REDIRECT_URI")!, scope: "openid email profile", code_challenge: challenge, code_challenge_method: "S256", state }).href;
  }

  async callback(query: Record<string, string>): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | { enrollmentToken: string; deviceRecordId: string; expiresIn: number }> {
    const state = query.state;
    const flow = state ? await this.redis.takeJson<{ verifier: string; deviceId: string; deviceName: string }>(`oidc:${state}`) : null;
    if (!flow) throw new UnauthorizedException("OIDC state expired");
    const { oidc, configuration } = await this.client();
    const callbackUrl = new URL(this.config.get("OIDC_REDIRECT_URI")!);
    Object.entries(query).forEach(([key, value]) => callbackUrl.searchParams.set(key, value));
    const tokens = await oidc.authorizationCodeGrant(configuration, callbackUrl, { pkceCodeVerifier: flow.verifier, expectedState: state });
    const claims = tokens.claims();
    const email = String(claims.email ?? "").toLowerCase();
    const employee = await this.employees.findOne({ where: [{ oidcSubject: String(claims.sub) }, { email }] });
    if (!employee || employee.status !== EntityStatus.ACTIVE) throw new UnauthorizedException("SSO identity is not provisioned in this organization");
    if (!employee.oidcSubject) { employee.oidcSubject = String(claims.sub); await this.employees.save(employee); }
    let device = await this.devices.findOneBy({ tenantId: employee.tenantId, employeeId: employee.id, deviceId: flow.deviceId });
    device ??= await this.devices.save(this.devices.create({ tenantId: employee.tenantId, employeeId: employee.id, deviceId: flow.deviceId, displayName: flow.deviceName, status: EntityStatus.PENDING, publicEncryptionKey: null, publicSigningKey: null, attestationLevel: "oidc-bootstrap", lastSeenAt: new Date() }));
    if (device.status !== EntityStatus.ACTIVE) {
      if (device.attestationLevel === "admin-approved-awaiting-webauthn") return this.auth.issueEnrollment(employee, device);
      throw new ForbiddenException({ message: "SSO succeeded, but this device requires administrator approval", deviceRecordId: device.id, status: device.status });
    }
    return this.auth.issueSession(employee, device);
  }
}
