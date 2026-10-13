import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import { Repository } from "typeorm";
import { DeviceEntity, EmployeeEntity, EmployeeRole, EntityStatus, OrganizationEntity, RoomEntity, RoomMemberEntity } from "./database/entities.js";

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(private readonly config: ConfigService, @InjectRepository(OrganizationEntity) private readonly organizations: Repository<OrganizationEntity>, @InjectRepository(EmployeeEntity) private readonly employees: Repository<EmployeeEntity>, @InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>, @InjectRepository(RoomEntity) private readonly rooms: Repository<RoomEntity>, @InjectRepository(RoomMemberEntity) private readonly members: Repository<RoomMemberEntity>) {}
  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get("DEMO_SEED", "false") !== "true") return;
    let organization = await this.organizations.findOneBy({ slug: "astana-industrial" });
    organization ??= await this.organizations.save(this.organizations.create({ slug: "astana-industrial", name: "Astana Industrial Group", licenseState: "active", cryptoProfile: "xchacha20-poly1305", keyEpoch: 1 }));
    const email = this.config.get("DEMO_ADMIN_EMAIL", "admin@astana-industrial.kz").toLowerCase();
    let employee = await this.employees.findOneBy({ tenantId: organization.id, email });
    if (!employee) employee = await this.employees.save(this.employees.create({ tenantId: organization.id, email, displayName: "Алия Даулетова", passwordHash: await argon2.hash(this.config.get("DEMO_ADMIN_PASSWORD", "demo-2026"), { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3 }), role: EmployeeRole.ADMIN, status: EntityStatus.ACTIVE, departmentId: null, oidcSubject: null }));
    if (!await this.devices.existsBy({ tenantId: organization.id, employeeId: employee.id, deviceId: "kontur-demo-browser" })) await this.devices.save(this.devices.create({ tenantId: organization.id, employeeId: employee.id, deviceId: "kontur-demo-browser", displayName: "Pilot browser", status: EntityStatus.ACTIVE, publicEncryptionKey: null, publicSigningKey: null, webauthnCredentialId: null, webauthnPublicKey: null, webauthnCounter: "0", webauthnTransports: [], attestationLevel: "demo-preapproved", lastSeenAt: null, revokedAt: null }));
    let room = await this.rooms.findOneBy({ tenantId: organization.id, createdBy: employee.id });
    room ??= await this.rooms.save(this.rooms.create({ tenantId: organization.id, encryptedMetadata: "client-provisioning-required", keyEpoch: 1, createdBy: employee.id }));
    if (!await this.members.existsBy({ tenantId: organization.id, roomId: room.id, employeeId: employee.id })) await this.members.save(this.members.create({ tenantId: organization.id, roomId: room.id, employeeId: employee.id, encryptedKeyEnvelope: "client-provisioning-required", joinedEpoch: 1 }));
  }
}
