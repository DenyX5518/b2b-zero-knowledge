import { randomUUID } from "node:crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service.js";
import type { AccessClaims } from "../auth/auth.types.js";
import { DocumentEntity, DocumentVersionEntity, EmployeeRole } from "../database/entities.js";
import { ObjectStorageService } from "../infrastructure/object-storage.service.js";
import type { CreateDocumentDto, CreateVersionDto } from "./documents.dto.js";

type DocumentPermission = "view" | "edit" | "share" | "download" | "print" | "sign" | "approve" | "delete" | "manage";

@Injectable()
export class DocumentsService {
  constructor(@InjectRepository(DocumentEntity) private readonly documents: Repository<DocumentEntity>, @InjectRepository(DocumentVersionEntity) private readonly versions: Repository<DocumentVersionEntity>, private readonly storage: ObjectStorageService, private readonly audit: AuditService, private readonly config: ConfigService, private readonly dataSource: DataSource) {}

  async create(user: AccessClaims, input: CreateDocumentDto, ciphertext: Express.Multer.File) {
    const policy = input.policy ? JSON.parse(input.policy) : { view: true, edit: true, share: false, download: false, print: false, sign: false, approve: false, delete: false, manage: false };
    const document = await this.documents.save(this.documents.create({ tenantId: user.tenantId, encryptedMetadata: input.encryptedMetadata, createdBy: user.sub, status: "draft", classification: input.classification ?? "internal", policy, currentVersion: 0 }));
    await this.createVersion(user, document.id, input, ciphertext);
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "document.created", targetRef: `document:${document.id}`, safeMetadata: { mimeType: input.mimeType, classification: document.classification } });
    return this.documents.findOneByOrFail({ id: document.id, tenantId: user.tenantId });
  }

  async createVersion(user: AccessClaims, documentId: string, input: CreateVersionDto, ciphertext: Express.Multer.File) {
    if (!ciphertext?.buffer?.length) throw new NotFoundException("Ciphertext upload is required");
    return this.dataSource.transaction(async (manager) => {
      const docs = manager.getRepository(DocumentEntity);
      const versions = manager.getRepository(DocumentVersionEntity);
      const document = await docs.createQueryBuilder("document").setLock("pessimistic_write").where("document.id = :documentId AND document.tenantId = :tenantId", { documentId, tenantId: user.tenantId }).getOne();
      if (!document) throw new NotFoundException("Document not found");
      this.assertPermission(user, document, document.currentVersion ? "edit" : "view");
      const version = document.currentVersion + 1;
      const objectKey = `${user.tenantId}/documents/${document.id}/v${version}/${randomUUID()}.ciphertext`;
      await this.storage.putCiphertext(objectKey, ciphertext.buffer);
      const saved = await versions.save(versions.create({ tenantId: user.tenantId, documentId, version, objectKey, wrappedDek: input.wrappedDek, contentHash: input.contentHash, mimeType: input.mimeType, size: String(ciphertext.size), authorId: user.sub, crdtStateVector: input.crdtStateVector ?? null }));
      document.currentVersion = version;
      await docs.save(document);
      await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "document.version.created", targetRef: `document:${document.id}/version:${version}`, safeMetadata: { mimeType: input.mimeType, ciphertextBytes: ciphertext.size } });
      return saved;
    });
  }

  async list(user: AccessClaims) { return this.documents.find({ where: { tenantId: user.tenantId }, order: { updatedAt: "DESC" }, take: 200 }); }

  async viewerAccess(user: AccessClaims, documentId: string) {
    const document = await this.documents.findOneBy({ id: documentId, tenantId: user.tenantId });
    if (!document) throw new NotFoundException("Document not found");
    this.assertPermission(user, document, "view");
    const version = await this.versions.findOneByOrFail({ tenantId: user.tenantId, documentId, version: document.currentVersion });
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "document.opened", targetRef: `document:${documentId}/version:${version.version}` });
    return { document, version: { id: version.id, version: version.version, mimeType: version.mimeType, size: version.size, wrappedDek: version.wrappedDek, contentHash: version.contentHash, crdtStateVector: version.crdtStateVector, ciphertextUrl: await this.storage.presignedCiphertext(version.objectKey, 180) }, permissions: document.policy, watermark: { subject: user.email, employeeId: user.sub, issuedAt: new Date().toISOString() } };
  }

  async trustedEditorConfig(user: AccessClaims, documentId: string) {
    if (this.config.get("TRUSTED_EDITOR_MODE", "false") !== "true") throw new ForbiddenException("OnlyOffice is available only in a customer-controlled trusted-editor deployment");
    const document = await this.documents.findOneBy({ id: documentId, tenantId: user.tenantId });
    if (!document) throw new NotFoundException("Document not found");
    this.assertPermission(user, document, "edit");
    const bridge = this.config.get<string>("TRUSTED_EDITOR_BRIDGE_URL");
    if (!bridge) throw new ForbiddenException("Trusted editor bridge is not configured");
    return { documentServerUrl: this.config.get("ONLYOFFICE_PUBLIC_URL", "http://localhost:8082"), config: { document: { fileType: "docx", key: `${document.id}:${document.currentVersion}`, title: `Encrypted document ${document.id}`, url: `${bridge}/sessions/${document.id}/content` }, documentType: "word", editorConfig: { callbackUrl: `${bridge}/sessions/${document.id}/callback`, mode: "edit", user: { id: user.sub, name: user.email }, customization: { forcesave: true } } }, securityBoundary: "OnlyOffice and the bridge must run inside the customer trust boundary; this mode intentionally terminates E2EE there." };
  }

  private assertPermission(user: AccessClaims, document: DocumentEntity, action: DocumentPermission): void {
    if ([EmployeeRole.ADMIN, EmployeeRole.SECURITY].includes(user.role) && action === "manage") return;
    if (!document.policy[action]) throw new ForbiddenException(`Document policy denies ${action}`);
  }
}
