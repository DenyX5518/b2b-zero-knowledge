import { createHash, randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service.js";
import type { AccessClaims } from "../auth/auth.types.js";
import { ChatGateway } from "../chats/chat.gateway.js";
import { DocumentEntity, DocumentVersionEntity } from "../database/entities.js";
import { ObjectStorageService } from "../infrastructure/object-storage.service.js";
import type { SyncDocumentVersionDto } from "./documents.dto.js";

// Документы, которые клиенты синхронизируют целиком (текст + история) одним зашифрованным payload.
const SYNC_MARKER = "client-sync:v1";
const SYNC_MIME = "application/vnd.kontur.document+json";

type StoredEnvelope = { nonce: string; aad: string; ciphertext: string };

@Injectable()
export class DocumentSyncService {
  constructor(
    @InjectRepository(DocumentEntity) private readonly documents: Repository<DocumentEntity>,
    @InjectRepository(DocumentVersionEntity) private readonly versions: Repository<DocumentVersionEntity>,
    private readonly storage: ObjectStorageService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
    private readonly realtime: ChatGateway
  ) {}

  // Отдаёт последнюю версию каждого документа: только wrapped DEK и ciphertext, без ключей и plaintext.
  async list(user: AccessClaims) {
    const documents = await this.documents.find({ where: { tenantId: user.tenantId, encryptedMetadata: SYNC_MARKER }, order: { updatedAt: "DESC" }, take: 200 });
    if (!documents.length) return [];
    const versions = await this.versions.find({ where: documents.map((document) => ({ tenantId: user.tenantId, documentId: document.id, version: document.currentVersion })) });
    return Promise.all(versions.map(async (version) => {
      const envelope = JSON.parse((await this.storage.getCiphertext(version.objectKey)).toString("utf8")) as StoredEnvelope;
      return { id: version.documentId, version: version.version, wrappedDek: version.wrappedDek, nonce: envelope.nonce, aad: envelope.aad, ciphertext: envelope.ciphertext, authorId: version.authorId, updatedAt: version.createdAt };
    }));
  }

  // Оптимистичная блокировка: версия принимается, только если клиент видел актуальную серверную версию.
  async push(user: AccessClaims, documentId: string, input: SyncDocumentVersionDto) {
    const result = await this.dataSource.transaction(async (manager) => {
      const documents = manager.getRepository(DocumentEntity);
      const versions = manager.getRepository(DocumentVersionEntity);
      let document = await documents.createQueryBuilder("document").setLock("pessimistic_write").where("document.id = :documentId", { documentId }).getOne();
      if (document && (document.tenantId !== user.tenantId || document.encryptedMetadata !== SYNC_MARKER)) throw new ForbiddenException("Document is not available for sync");
      if (!document) {
        if (input.baseVersion !== 0) throw this.conflict(0);
        try {
          document = await documents.save(documents.create({ id: documentId, tenantId: user.tenantId, encryptedMetadata: SYNC_MARKER, createdBy: user.sub, status: "draft", classification: "internal", policy: { view: true, edit: true, share: false, download: false, print: false, sign: false, approve: false, delete: false, manage: false }, currentVersion: 0 }));
        } catch {
          throw this.conflict(0); // документ параллельно создало другое устройство
        }
      }
      if (input.baseVersion !== document.currentVersion || input.version <= document.currentVersion) throw this.conflict(document.currentVersion);
      if (!document.policy.edit) throw new ForbiddenException("Document policy denies edit");
      const body = Buffer.from(JSON.stringify({ nonce: input.nonce, aad: input.aad, ciphertext: input.ciphertext } satisfies StoredEnvelope));
      const objectKey = `${user.tenantId}/documents/${documentId}/v${input.version}/${randomUUID()}.json`;
      await this.storage.putCiphertext(objectKey, body, "application/json");
      await versions.save(versions.create({ tenantId: user.tenantId, documentId, version: input.version, objectKey, wrappedDek: input.wrappedDek, contentHash: createHash("sha256").update(body).digest("hex"), mimeType: SYNC_MIME, size: String(body.length), authorId: user.sub, crdtStateVector: null }));
      document.currentVersion = input.version;
      await documents.save(document);
      return { id: documentId, version: input.version };
    });
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "document.version.synced", targetRef: `document:${documentId}/version:${result.version}`, safeMetadata: { ciphertextBytes: input.ciphertext.length } });
    this.realtime.notifyTenant(user.tenantId, "document:updated", { ...result, deviceId: user.deviceId });
    return result;
  }

  private conflict(currentVersion: number) {
    return new ConflictException({ message: "Документ уже изменён на другом устройстве", currentVersion });
  }
}
