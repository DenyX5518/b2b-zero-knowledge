import { randomBytes, randomUUID } from "node:crypto";
import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import { DataSource, IsNull, Repository } from "typeorm";
import { DeviceEntity, EmployeeEntity, EntityStatus, RefreshSessionEntity } from "../database/entities.js";
import type { AccessClaims, EnrollmentClaims } from "./auth.types.js";
import type { LoginDto } from "./auth.dto.js";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(EmployeeEntity) private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>,
    @InjectRepository(RefreshSessionEntity) private readonly sessions: Repository<RefreshSessionEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource
  ) {}

  async login(input: LoginDto): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | { enrollmentToken: string; deviceRecordId: string; expiresIn: number }> {
    const employee = await this.employees.createQueryBuilder("employee").addSelect("employee.passwordHash").where("LOWER(employee.email) = LOWER(:email)", { email: input.email }).getOne();
    if (!employee?.passwordHash || employee.status !== EntityStatus.ACTIVE || !await argon2.verify(employee.passwordHash, input.password)) throw new UnauthorizedException("Invalid credentials");
    let device = await this.devices.findOneBy({ tenantId: employee.tenantId, employeeId: employee.id, deviceId: input.deviceId });
    if (!device) {
      device = await this.devices.save(this.devices.create({ tenantId: employee.tenantId, employeeId: employee.id, deviceId: input.deviceId, displayName: input.deviceName, publicEncryptionKey: input.publicEncryptionKey ?? null, publicSigningKey: input.publicSigningKey ?? null, status: EntityStatus.PENDING, attestationLevel: "password-bootstrap", lastSeenAt: new Date() }));
    }
    if (device.status === EntityStatus.REVOKED) throw new UnauthorizedException("Device was revoked");
    if (device.status !== EntityStatus.ACTIVE) {
      if (device.attestationLevel === "admin-approved-awaiting-webauthn") return this.issueEnrollment(employee, device);
      throw new ForbiddenException({ message: "Device approval is required before WebAuthn enrollment", deviceRecordId: device.id, status: device.status });
    }
    device.lastSeenAt = new Date();
    await this.devices.save(device);
    return this.issueSession(employee, device);
  }

  async issueSession(employee: EmployeeEntity, device: DeviceEntity): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const secret = randomBytes(32).toString("base64url");
    const days = Number(this.config.get("REFRESH_TOKEN_DAYS", 14));
    const session = await this.sessions.save(this.sessions.create({ tenantId: employee.tenantId, employeeId: employee.id, deviceId: device.id, familyId: randomUUID(), currentHash: await this.hashSecret(secret), previousHash: null, rotatedAt: null, expiresAt: new Date(Date.now() + days * 86_400_000), revokedAt: null, revokeReason: null }));
    return { accessToken: await this.accessToken(employee, device), refreshToken: `${session.id}.${secret}`, expiresIn: 300 };
  }

  async issueEnrollment(employee: EmployeeEntity, device: DeviceEntity): Promise<{ enrollmentToken: string; deviceRecordId: string; expiresIn: number }> {
    const claims: EnrollmentClaims = { sub: employee.id, tenantId: employee.tenantId, deviceId: device.id, role: employee.role, email: employee.email, type: "enrollment" };
    return { enrollmentToken: await this.jwt.signAsync(claims, { expiresIn: "10m" }), deviceRecordId: device.id, expiresIn: 600 };
  }

  async verifyEnrollmentToken(token: string): Promise<EnrollmentClaims> {
    try {
      const claims = await this.jwt.verifyAsync<EnrollmentClaims>(token);
      if (claims.type !== "enrollment" || !claims.deviceId || !claims.tenantId) throw new Error("Invalid enrollment claims");
      return claims;
    } catch { throw new UnauthorizedException("Invalid or expired enrollment token"); }
  }

  async rotateRefreshToken(presented: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const [sessionId, secret] = presented.split(".");
    if (!sessionId || !secret) throw new UnauthorizedException("Malformed refresh token");
    return this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(RefreshSessionEntity);
      const session = await sessions.createQueryBuilder("session").setLock("pessimistic_write").addSelect(["session.currentHash", "session.previousHash"]).where("session.id = :sessionId", { sessionId }).getOne();
      if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException("Refresh session expired");
      if (session.previousHash && await argon2.verify(session.previousHash, secret)) {
        await sessions.update({ familyId: session.familyId, revokedAt: IsNull() }, { revokedAt: new Date(), revokeReason: "refresh-token-reuse" });
        throw new UnauthorizedException("Refresh token reuse detected; session family revoked");
      }
      if (!await argon2.verify(session.currentHash, secret)) throw new UnauthorizedException("Invalid refresh token");
      const [employee, device] = await Promise.all([
        manager.getRepository(EmployeeEntity).findOneByOrFail({ id: session.employeeId, tenantId: session.tenantId }),
        manager.getRepository(DeviceEntity).findOneByOrFail({ id: session.deviceId, tenantId: session.tenantId })
      ]);
      if (employee.status !== EntityStatus.ACTIVE || device.status !== EntityStatus.ACTIVE) throw new UnauthorizedException("Account or device is not active");
      const nextSecret = randomBytes(32).toString("base64url");
      session.previousHash = session.currentHash;
      session.currentHash = await this.hashSecret(nextSecret);
      session.rotatedAt = new Date();
      await sessions.save(session);
      return { accessToken: await this.accessToken(employee, device), refreshToken: `${session.id}.${nextSecret}`, expiresIn: 300 };
    });
  }

  async revokeFamily(refreshToken: string): Promise<void> {
    const [sessionId] = refreshToken.split(".");
    const session = await this.sessions.findOneBy({ id: sessionId });
    if (session) await this.sessions.update({ familyId: session.familyId, revokedAt: IsNull() }, { revokedAt: new Date(), revokeReason: "logout" });
  }

  private async accessToken(employee: EmployeeEntity, device: DeviceEntity): Promise<string> {
    const claims: AccessClaims = { sub: employee.id, tenantId: employee.tenantId, deviceId: device.id, role: employee.role, email: employee.email, type: "access" };
    return this.jwt.signAsync(claims, { expiresIn: this.config.get("ACCESS_TOKEN_TTL", "5m") as any });
  }
  private hashSecret(secret: string): Promise<string> { return argon2.hash(secret, { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 }); }
}
