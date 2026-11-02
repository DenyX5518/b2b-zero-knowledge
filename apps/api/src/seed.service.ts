import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import { Repository } from "typeorm";
import { DeviceEntity, EmployeeEntity, EmployeeRole, EntityStatus, OrganizationEntity, RoomEntity, RoomMemberEntity } from "./database/entities.js";

const DEMO_ORG_SLUG = "aktau-industrial";
const DEMO_ORG_NAME = "Aktau Industrial Group";
const DEMO_ADMIN_NAME = "Тестов Тест Тестович";

// Устройства, которые демо-стенд считает уже одобренными администратором: web-клиент и iOS-клиент.
const DEMO_DEVICES = [
  ["kontur-demo-browser", "Pilot browser"],
  ["kontur-demo-mobile", "Pilot iPhone"]
] as const;

// UUID комнат совпадают с web и mobile клиентами. Сервер знает только идентификатор,
// а название комнаты («Совет директоров» и т. д.) существует лишь на клиентах.
export const DEMO_ROOM_IDS = [
  "c340d1ac-2d53-405a-bb92-9fd423b41899",
  "18c59cf0-eb06-442a-8221-d9e3f5c8d373",
  "75c73883-5363-4766-ac1c-0ba06e93b629",
  "e8c107c4-4ce7-431e-9962-e3d3cbc1c6ff"
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(private readonly config: ConfigService, @InjectRepository(OrganizationEntity) private readonly organizations: Repository<OrganizationEntity>, @InjectRepository(EmployeeEntity) private readonly employees: Repository<EmployeeEntity>, @InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>, @InjectRepository(RoomEntity) private readonly rooms: Repository<RoomEntity>, @InjectRepository(RoomMemberEntity) private readonly members: Repository<RoomMemberEntity>) {}
  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get("DEMO_SEED", "false") !== "true") return;
    let organization = await this.organizations.findOneBy({ slug: DEMO_ORG_SLUG });
    organization ??= await this.organizations.save(this.organizations.create({ slug: DEMO_ORG_SLUG, name: DEMO_ORG_NAME, licenseState: "active", cryptoProfile: "xchacha20-poly1305", keyEpoch: 1 }));
    const tenantId = organization.id;
    const email = this.config.get("DEMO_ADMIN_EMAIL", "admin@aktau-industrial.kz").toLowerCase();
    let employee = await this.employees.findOneBy({ tenantId, email });
    if (!employee) employee = await this.employees.save(this.employees.create({ tenantId, email, displayName: DEMO_ADMIN_NAME, passwordHash: await argon2.hash(this.config.get("DEMO_ADMIN_PASSWORD", "demo-2026"), { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3 }), role: EmployeeRole.ADMIN, status: EntityStatus.ACTIVE, departmentId: null, oidcSubject: null }));
    else if (employee.displayName !== DEMO_ADMIN_NAME) await this.employees.update({ id: employee.id }, { displayName: DEMO_ADMIN_NAME });
    for (const [deviceId, displayName] of DEMO_DEVICES) {
      if (!await this.devices.existsBy({ tenantId, employeeId: employee.id, deviceId })) await this.devices.save(this.devices.create({ tenantId, employeeId: employee.id, deviceId, displayName, status: EntityStatus.ACTIVE, publicEncryptionKey: null, publicSigningKey: null, webauthnCredentialId: null, webauthnPublicKey: null, webauthnCounter: "0", webauthnTransports: [], attestationLevel: "demo-preapproved", lastSeenAt: null, revokedAt: null }));
    }
    for (const roomId of DEMO_ROOM_IDS) {
      if (!await this.rooms.existsBy({ id: roomId })) await this.rooms.save(this.rooms.create({ id: roomId, tenantId, encryptedMetadata: "client-provisioning-required", keyEpoch: 1, createdBy: employee.id }));
      if (!await this.members.existsBy({ tenantId, roomId, employeeId: employee.id })) await this.members.save(this.members.create({ tenantId, roomId, employeeId: employee.id, encryptedKeyEnvelope: "client-provisioning-required", joinedEpoch: 1 }));
    }
  }
}
