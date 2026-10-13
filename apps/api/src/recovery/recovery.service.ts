import { createHash, createPublicKey, verify } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service.js";
import type { AccessClaims } from "../auth/auth.types.js";
import { DeviceEntity, EmployeeRole, RecoveryApprovalEntity, RecoveryCeremonyEntity } from "../database/entities.js";
import type { ApproveRecoveryDto, StartRecoveryDto } from "./recovery.dto.js";

@Injectable()
export class RecoveryService {
  constructor(@InjectRepository(RecoveryCeremonyEntity) private readonly ceremonies: Repository<RecoveryCeremonyEntity>, @InjectRepository(RecoveryApprovalEntity) private readonly approvals: Repository<RecoveryApprovalEntity>, @InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>, private readonly audit: AuditService) {}

  async start(user: AccessClaims, input: StartRecoveryDto) {
    if (![EmployeeRole.ADMIN, EmployeeRole.SECURITY, EmployeeRole.EXECUTIVE].includes(user.role)) throw new ForbiddenException("Recovery requires an authorized key holder");
    if (input.threshold > input.total) throw new BadRequestException("Threshold must not exceed total shares");
    const ceremony = await this.ceremonies.save(this.ceremonies.create({ tenantId: user.tenantId, requestedBy: user.sub, threshold: input.threshold, total: input.total, status: "pending", workstationPublicKey: input.workstationPublicKey, expiresAt: new Date(Date.now() + 15 * 60_000), completedAt: null }));
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "recovery.started", targetRef: `recovery:${ceremony.id}`, safeMetadata: { threshold: input.threshold, total: input.total, expiresAt: ceremony.expiresAt.toISOString() } });
    return { ...ceremony, providerCanDecryptShares: false };
  }

  async approve(user: AccessClaims, ceremonyId: string, input: ApproveRecoveryDto) {
    const ceremony = await this.ceremonies.findOneBy({ id: ceremonyId, tenantId: user.tenantId });
    if (!ceremony || ceremony.expiresAt <= new Date()) throw new NotFoundException("Recovery ceremony expired or not found");
    if (ceremony.status !== "pending") throw new BadRequestException("Recovery ceremony is not accepting approvals");
    const device = await this.devices.findOneBy({ id: user.deviceId, tenantId: user.tenantId, employeeId: user.sub });
    if (!device?.publicSigningKey) throw new ForbiddenException("A registered device signing key is required");
    const envelopeHash = createHash("sha256").update(input.encryptedShareEnvelope).digest("hex");
    const signedPayload = Buffer.from(`${ceremonyId}.${envelopeHash}`);
    const signatureValid = verify(null, signedPayload, createPublicKey(device.publicSigningKey), Buffer.from(input.deviceSignature, "base64"));
    if (!signatureValid) throw new ForbiddenException("Device signature is invalid");
    await this.approvals.save(this.approvals.create({ tenantId: user.tenantId, ceremonyId, holderId: user.sub, encryptedShareEnvelope: input.encryptedShareEnvelope, deviceSignature: input.deviceSignature, approvedAt: new Date() }));
    const count = await this.approvals.countBy({ tenantId: user.tenantId, ceremonyId });
    if (count >= ceremony.threshold) { ceremony.status = "ready"; await this.ceremonies.save(ceremony); }
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "recovery.share.approved", targetRef: `recovery:${ceremonyId}`, safeMetadata: { approvals: count, threshold: ceremony.threshold } });
    return { status: ceremony.status, approvals: count, threshold: ceremony.threshold };
  }

  async bundle(user: AccessClaims, ceremonyId: string) {
    const ceremony = await this.ceremonies.findOneBy({ id: ceremonyId, tenantId: user.tenantId });
    if (!ceremony || ceremony.status !== "ready") throw new ForbiddenException("Recovery quorum is not ready");
    const approvals = await this.approvals.find({ where: { tenantId: user.tenantId, ceremonyId }, take: ceremony.threshold });
    ceremony.status = "delivered";
    ceremony.completedAt = new Date();
    await this.ceremonies.save(ceremony);
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "recovery.bundle.delivered", targetRef: `recovery:${ceremonyId}`, safeMetadata: { shares: approvals.length } });
    return { ceremonyId, workstationPublicKey: ceremony.workstationPublicKey, encryptedShareEnvelopes: approvals.map(({ holderId, encryptedShareEnvelope, deviceSignature }) => ({ holderId, encryptedShareEnvelope, deviceSignature })) };
  }
}
