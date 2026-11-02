import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module.js";
import { ChatsModule } from "../chats/chats.module.js";
import { DocumentEntity, DocumentVersionEntity } from "../database/entities.js";
import { DocumentSyncService } from "./document-sync.service.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";

@Module({ imports: [TypeOrmModule.forFeature([DocumentEntity, DocumentVersionEntity]), AuditModule, ChatsModule], controllers: [DocumentsController], providers: [DocumentsService, DocumentSyncService] })
export class DocumentsModule {}
