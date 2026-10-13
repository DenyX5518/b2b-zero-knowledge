import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module.js";
import { DocumentEntity, DocumentVersionEntity } from "../database/entities.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";

@Module({ imports: [TypeOrmModule.forFeature([DocumentEntity, DocumentVersionEntity]), AuditModule], controllers: [DocumentsController], providers: [DocumentsService] })
export class DocumentsModule {}
