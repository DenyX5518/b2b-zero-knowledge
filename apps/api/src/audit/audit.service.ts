import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { AuditEventEntity } from "../database/entities.js";
import { HsmService } from "../infrastructure/hsm.service.js";

export type AuditInput = { tenantId: string; actorId?: string | null; action: string; targetRef: string; decision?: "allowed" | "denied"; safeMetadata?: Record<string, unknown> };

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditEventEntity) private readonly events: Repository<AuditEventEntity>, private readonly dataSource: DataSource, private readonly hsm: HsmService) {}

  async append(input: AuditInput): Promise<AuditEventEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AuditEventEntity);
      const previous = await repo.createQueryBuilder("event").setLock("pessimistic_write").where("event.tenantId = :tenantId", { tenantId: input.tenantId }).orderBy("event.sequence", "DESC").getOne();
      const sequence = BigInt(previous?.sequence ?? "0") + 1n;
      const occurredAt = new Date();
      const payload = { tenantId: input.tenantId, sequence: sequence.toString(), actorId: input.actorId ?? null, action: input.action, targetRef: input.targetRef, decision: input.decision ?? "allowed", safeMetadata: input.safeMetadata ?? {}, prevHash: previous?.eventHash ?? "GENESIS", occurredAt: occurredAt.toISOString() };
      const eventHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
      const signature = await this.hsm.signDigest(Buffer.from(eventHash, "hex"));
      return repo.save(repo.create({ ...payload, occurredAt, eventHash, signature, signingKeyId: this.hsm.keyId }));
    });
  }

  list(tenantId: string, limit = 200): Promise<AuditEventEntity[]> { return this.events.find({ where: { tenantId }, order: { sequence: "DESC" }, take: Math.min(limit, 500) }); }

  async verify(tenantId: string): Promise<{ valid: boolean; checked: number; head: string }> {
    const events = await this.events.find({ where: { tenantId }, order: { sequence: "ASC" } });
    let previous = "GENESIS";
    for (const event of events) {
      const payload = { tenantId: event.tenantId, sequence: event.sequence, actorId: event.actorId, action: event.action, targetRef: event.targetRef, decision: event.decision, safeMetadata: event.safeMetadata, prevHash: event.prevHash, occurredAt: event.occurredAt.toISOString() };
      const expectedHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
      const signatureValid = await this.hsm.verifyDigest(Buffer.from(event.eventHash, "hex"), event.signature);
      if (event.prevHash !== previous || event.eventHash !== expectedHash || !signatureValid) return { valid: false, checked: Number(event.sequence) - 1, head: previous };
      previous = event.eventHash;
    }
    return { valid: true, checked: events.length, head: previous };
  }
}
