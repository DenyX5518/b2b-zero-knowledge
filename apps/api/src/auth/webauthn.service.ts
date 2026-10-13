import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { Repository } from "typeorm";
import { DeviceEntity, EmployeeEntity, EntityStatus } from "../database/entities.js";
import { RedisService } from "../infrastructure/redis.service.js";
import { AuthService } from "./auth.service.js";

@Injectable()
export class WebAuthnService {
  constructor(@InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>, @InjectRepository(EmployeeEntity) private readonly employees: Repository<EmployeeEntity>, private readonly redis: RedisService, private readonly config: ConfigService, private readonly auth: AuthService) {}
  private get rpID(): string { return this.config.get("WEBAUTHN_RP_ID", "localhost"); }
  private get origin(): string { return this.config.get("WEBAUTHN_ORIGIN", "http://localhost:4173"); }

  async registrationOptions(employeeId: string, tenantId: string, deviceRecordId: string) {
    const [employee, device] = await Promise.all([this.employees.findOneByOrFail({ id: employeeId, tenantId }), this.devices.findOneByOrFail({ id: deviceRecordId, employeeId, tenantId })]);
    const options = await generateRegistrationOptions({ rpName: this.config.get("WEBAUTHN_RP_NAME", "Kontur"), rpID: this.rpID, userID: new TextEncoder().encode(employee.id), userName: employee.email, attestationType: "direct", authenticatorSelection: { residentKey: "preferred", userVerification: "required" } });
    await this.redis.setJson(`webauthn:register:${device.id}`, { challenge: options.challenge, employeeId, tenantId }, 300);
    return options;
  }

  async verifyRegistration(employeeId: string, tenantId: string, deviceRecordId: string, response: any) {
    const challenge = await this.redis.takeJson<{ challenge: string; employeeId: string; tenantId: string }>(`webauthn:register:${deviceRecordId}`);
    if (!challenge || challenge.employeeId !== employeeId || challenge.tenantId !== tenantId) throw new UnauthorizedException("Registration challenge expired");
    const verification = await verifyRegistrationResponse({ response, expectedChallenge: challenge.challenge, expectedOrigin: this.origin, expectedRPID: this.rpID, requireUserVerification: true });
    if (!verification.verified || !verification.registrationInfo) throw new UnauthorizedException("Passkey attestation failed");
    const device = await this.devices.findOneByOrFail({ id: deviceRecordId, tenantId, employeeId });
    device.webauthnCredentialId = verification.registrationInfo.credential.id;
    device.webauthnPublicKey = Buffer.from(verification.registrationInfo.credential.publicKey);
    device.webauthnCounter = String(verification.registrationInfo.credential.counter);
    device.webauthnTransports = response.response?.transports ?? [];
    device.attestationLevel = verification.registrationInfo.aaguid ? `webauthn:${verification.registrationInfo.aaguid}` : "webauthn";
    device.status = EntityStatus.ACTIVE;
    await this.devices.save(device);
    return { verified: true, deviceId: device.id, attestationLevel: device.attestationLevel };
  }

  async authenticationOptions(email: string) {
    const employee = await this.employees.findOneBy({ email: email.toLowerCase(), status: EntityStatus.ACTIVE });
    if (!employee) throw new NotFoundException("Employee was not found");
    const devices = await this.devices.findBy({ tenantId: employee.tenantId, employeeId: employee.id, status: EntityStatus.ACTIVE });
    const options = await generateAuthenticationOptions({ rpID: this.rpID, userVerification: "required", allowCredentials: devices.filter((device) => device.webauthnCredentialId).map((device) => ({ id: device.webauthnCredentialId!, transports: device.webauthnTransports as any })) });
    await this.redis.setJson(`webauthn:authenticate:${options.challenge}`, { employeeId: employee.id, tenantId: employee.tenantId }, 300);
    return options;
  }

  async verifyAuthentication(challengeValue: string, response: any) {
    const challenge = await this.redis.takeJson<{ employeeId: string; tenantId: string }>(`webauthn:authenticate:${challengeValue}`);
    if (!challenge) throw new UnauthorizedException("Authentication challenge expired");
    const employee = await this.employees.findOneByOrFail({ id: challenge.employeeId, tenantId: challenge.tenantId, status: EntityStatus.ACTIVE });
    const device = await this.devices.findOneByOrFail({ tenantId: challenge.tenantId, employeeId: employee.id, webauthnCredentialId: response.id, status: EntityStatus.ACTIVE });
    const verification = await verifyAuthenticationResponse({ response, expectedChallenge: challengeValue, expectedOrigin: this.origin, expectedRPID: this.rpID, credential: { id: device.webauthnCredentialId!, publicKey: new Uint8Array(device.webauthnPublicKey!), counter: Number(device.webauthnCounter), transports: device.webauthnTransports as any }, requireUserVerification: true });
    if (!verification.verified) throw new UnauthorizedException("Passkey verification failed");
    device.webauthnCounter = String(verification.authenticationInfo.newCounter);
    device.lastSeenAt = new Date();
    await this.devices.save(device);
    return this.auth.issueSession(employee, device);
  }
}
