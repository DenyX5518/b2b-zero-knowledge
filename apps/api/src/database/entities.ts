import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

export enum EmployeeRole { ADMIN = "admin", EXECUTIVE = "executive", SECURITY = "security", LEGAL = "legal", EMPLOYEE = "employee" }
export enum EntityStatus { ACTIVE = "active", BLOCKED = "blocked", PENDING = "pending", REVOKED = "revoked" }

@Entity("organizations")
export class OrganizationEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ unique: true }) slug!: string;
  @Column() name!: string;
  @Column({ name: "license_state", default: "active" }) licenseState!: string;
  @Column({ name: "crypto_profile", default: "xchacha20-poly1305" }) cryptoProfile!: string;
  @Column({ name: "key_epoch", default: 1 }) keyEpoch!: number;
  @CreateDateColumn({ name: "created_at" }) createdAt!: Date;
}

abstract class TenantEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index()
  @Column({ name: "tenant_id", type: "uuid" }) tenantId!: string;
  @CreateDateColumn({ name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt!: Date;
}

@Entity("employees")
@Unique(["tenantId", "email"])
export class EmployeeEntity extends TenantEntity {
  @Column() email!: string;
  @Column({ name: "display_name" }) displayName!: string;
  @Column({ name: "password_hash", nullable: true, select: false }) passwordHash!: string | null;
  @Column({ type: "enum", enum: EmployeeRole, default: EmployeeRole.EMPLOYEE }) role!: EmployeeRole;
  @Column({ type: "enum", enum: EntityStatus, default: EntityStatus.PENDING }) status!: EntityStatus;
  @Column({ name: "department_id", type: "uuid", nullable: true }) departmentId!: string | null;
  @Column({ name: "oidc_subject", nullable: true }) oidcSubject!: string | null;
}

@Entity("devices")
@Unique(["tenantId", "employeeId", "deviceId"])
export class DeviceEntity extends TenantEntity {
  @Index()
  @Column({ name: "employee_id", type: "uuid" }) employeeId!: string;
  @Column({ name: "device_id" }) deviceId!: string;
  @Column({ name: "display_name" }) displayName!: string;
  @Column({ type: "enum", enum: EntityStatus, default: EntityStatus.PENDING }) status!: EntityStatus;
  @Column({ name: "public_enc_key", type: "text", nullable: true }) publicEncryptionKey!: string | null;
  @Column({ name: "public_signing_key", type: "text", nullable: true }) publicSigningKey!: string | null;
  @Column({ name: "webauthn_credential_id", type: "text", nullable: true }) webauthnCredentialId!: string | null;
  @Column({ name: "webauthn_public_key", type: "bytea", nullable: true }) webauthnPublicKey!: Buffer | null;
  @Column({ name: "webauthn_counter", type: "bigint", default: 0 }) webauthnCounter!: string;
  @Column({ name: "webauthn_transports", type: "jsonb", default: () => "'[]'::jsonb" }) webauthnTransports!: string[];
  @Column({ name: "attestation_level", default: "unverified" }) attestationLevel!: string;
  @Column({ name: "last_seen_at", type: "timestamptz", nullable: true }) lastSeenAt!: Date | null;
  @Column({ name: "revoked_at", type: "timestamptz", nullable: true }) revokedAt!: Date | null;
}

@Entity("refresh_sessions")
export class RefreshSessionEntity extends TenantEntity {
  @Index()
  @Column({ name: "employee_id", type: "uuid" }) employeeId!: string;
  @Column({ name: "device_id", type: "uuid" }) deviceId!: string;
  @Index()
  @Column({ name: "family_id", type: "uuid" }) familyId!: string;
  @Column({ name: "current_hash", type: "text", select: false }) currentHash!: string;
  @Column({ name: "previous_hash", type: "text", nullable: true, select: false }) previousHash!: string | null;
  @Column({ name: "rotated_at", type: "timestamptz", nullable: true }) rotatedAt!: Date | null;
  @Column({ name: "expires_at", type: "timestamptz" }) expiresAt!: Date;
  @Column({ name: "revoked_at", type: "timestamptz", nullable: true }) revokedAt!: Date | null;
  @Column({ name: "revoke_reason", nullable: true }) revokeReason!: string | null;
}

@Entity("rooms")
export class RoomEntity extends TenantEntity {
  @Column({ type: "text" }) encryptedMetadata!: string;
  @Column({ name: "key_epoch", default: 1 }) keyEpoch!: number;
  @Column({ name: "created_by", type: "uuid" }) createdBy!: string;
}

@Entity("room_members")
@Unique(["tenantId", "roomId", "employeeId"])
export class RoomMemberEntity extends TenantEntity {
  @Index()
  @Column({ name: "room_id", type: "uuid" }) roomId!: string;
  @Index()
  @Column({ name: "employee_id", type: "uuid" }) employeeId!: string;
  @Column({ name: "encrypted_key_envelope", type: "text" }) encryptedKeyEnvelope!: string;
  @Column({ name: "joined_epoch", default: 1 }) joinedEpoch!: number;
}

@Entity("messages")
@Unique(["tenantId", "clientMessageId"])
export class MessageEntity extends TenantEntity {
  @Index()
  @Column({ name: "room_id", type: "uuid" }) roomId!: string;
  @Column({ name: "sender_id", type: "uuid" }) senderId!: string;
  @Column({ name: "sender_device_id", type: "uuid" }) senderDeviceId!: string;
  @Column({ name: "client_message_id", type: "uuid" }) clientMessageId!: string;
  @Column({ type: "text" }) ciphertext!: string;
  @Column({ type: "text" }) nonce!: string;
  @Column({ type: "text" }) aad!: string;
  @Column({ name: "key_epoch" }) keyEpoch!: number;
  @Column({ name: "edited_at", type: "timestamptz", nullable: true }) editedAt!: Date | null;
  @Column({ name: "deleted_at", type: "timestamptz", nullable: true }) deletedAt!: Date | null;
}

@Entity("documents")
export class DocumentEntity extends TenantEntity {
  @Column({ type: "text" }) encryptedMetadata!: string;
  @Column({ name: "created_by", type: "uuid" }) createdBy!: string;
  @Column({ default: "draft" }) status!: string;
  @Column({ default: "internal" }) classification!: string;
  @Column({ name: "policy_json", type: "jsonb", default: () => "'{\"view\":true,\"edit\":true,\"download\":false,\"print\":false}'::jsonb" }) policy!: Record<string, boolean>;
  @Column({ name: "current_version", default: 0 }) currentVersion!: number;
}

@Entity("document_versions")
@Unique(["tenantId", "documentId", "version"])
export class DocumentVersionEntity extends TenantEntity {
  @Index()
  @Column({ name: "document_id", type: "uuid" }) documentId!: string;
  @Column() version!: number;
  @Column({ name: "object_key" }) objectKey!: string;
  @Column({ name: "wrapped_dek", type: "text" }) wrappedDek!: string;
  @Column({ name: "content_hash" }) contentHash!: string;
  @Column({ name: "mime_type" }) mimeType!: string;
  @Column({ type: "bigint" }) size!: string;
  @Column({ name: "author_id", type: "uuid" }) authorId!: string;
  @Column({ name: "crdt_state_vector", type: "text", nullable: true }) crdtStateVector!: string | null;
}

@Entity("audit_events")
@Index(["tenantId", "sequence"], { unique: true })
export class AuditEventEntity extends TenantEntity {
  @Column({ type: "bigint" }) sequence!: string;
  @Column({ name: "actor_id", type: "uuid", nullable: true }) actorId!: string | null;
  @Column() action!: string;
  @Column({ name: "target_ref" }) targetRef!: string;
  @Column() decision!: string;
  @Column({ name: "safe_metadata", type: "jsonb", default: () => "'{}'::jsonb" }) safeMetadata!: Record<string, unknown>;
  @Column({ name: "prev_hash" }) prevHash!: string;
  @Column({ name: "event_hash" }) eventHash!: string;
  @Column({ type: "text" }) signature!: string;
  @Column({ name: "signing_key_id" }) signingKeyId!: string;
  @Column({ name: "occurred_at", type: "timestamptz" }) occurredAt!: Date;
}

@Entity("recovery_ceremonies")
export class RecoveryCeremonyEntity extends TenantEntity {
  @Column({ name: "requested_by", type: "uuid" }) requestedBy!: string;
  @Column({ default: 2 }) threshold!: number;
  @Column({ default: 3 }) total!: number;
  @Column({ default: "pending" }) status!: string;
  @Column({ name: "workstation_public_key", type: "text" }) workstationPublicKey!: string;
  @Column({ name: "expires_at", type: "timestamptz" }) expiresAt!: Date;
  @Column({ name: "completed_at", type: "timestamptz", nullable: true }) completedAt!: Date | null;
}

@Entity("recovery_approvals")
@Unique(["tenantId", "ceremonyId", "holderId"])
export class RecoveryApprovalEntity extends TenantEntity {
  @Column({ name: "ceremony_id", type: "uuid" }) ceremonyId!: string;
  @Column({ name: "holder_id", type: "uuid" }) holderId!: string;
  @Column({ name: "encrypted_share_envelope", type: "text" }) encryptedShareEnvelope!: string;
  @Column({ name: "device_signature", type: "text" }) deviceSignature!: string;
  @Column({ name: "approved_at", type: "timestamptz" }) approvedAt!: Date;
}

export const ALL_ENTITIES = [OrganizationEntity, EmployeeEntity, DeviceEntity, RefreshSessionEntity, RoomEntity, RoomMemberEntity, MessageEntity, DocumentEntity, DocumentVersionEntity, AuditEventEntity, RecoveryCeremonyEntity, RecoveryApprovalEntity];
