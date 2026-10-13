import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service.js";
import type { AccessClaims } from "../auth/auth.types.js";
import { DeviceEntity, EntityStatus, RefreshSessionEntity } from "../database/entities.js";

@Injectable()
export class DevicesService {
  constructor(@InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>, @InjectRepository(RefreshSessionEntity) private readonly sessions: Repository<RefreshSessionEntity>, private readonly audit: AuditService) {}
  list(user: AccessClaims) { return this.devices.find({ where: { tenantId: user.tenantId }, order: { updatedAt: "DESC" } }); }
  async approve(user: AccessClaims, id: string) {
    const device = await this.devices.findOneBy({ id, tenantId: user.tenantId });
    if (!device) throw new NotFoundException("Device not found");
    device.status = EntityStatus.PENDING;
    device.attestationLevel = "admin-approved-awaiting-webauthn";
    await this.devices.save(device);
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "device.approved.for-enrollment", targetRef: `device:${id}`, safeMetadata: { attestationLevel: device.attestationLevel } });
    return device;
  }
  async revoke(user: AccessClaims, id: string) {
    const device = await this.devices.findOneBy({ id, tenantId: user.tenantId });
    if (!device) throw new NotFoundException("Device not found");
    device.status = EntityStatus.REVOKED; device.revokedAt = new Date();
    await this.devices.save(device);
    await this.sessions.update({ tenantId: user.tenantId, deviceId: id, revokedAt: IsNull() }, { revokedAt: new Date(), revokeReason: "device-revoked" });
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "device.revoked", targetRef: `device:${id}` });
    return { revoked: true, requiresGroupKeyRotation: true };
  }
}
