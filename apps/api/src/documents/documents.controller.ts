import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { CreateDocumentDto, CreateVersionDto } from "./documents.dto.js";
import { DocumentsService } from "./documents.service.js";

const encryptedUpload = FileInterceptor("ciphertext", { limits: { fileSize: 100 * 1024 * 1024, files: 1 } });

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}
  @Get() list(@Req() request: Request) { return this.documents.list(request.user!); }
  @Post() @UseInterceptors(encryptedUpload) create(@Req() request: Request, @Body() input: CreateDocumentDto, @UploadedFile() file: Express.Multer.File) { return this.documents.create(request.user!, input, file); }
  @Post(":documentId/versions") @UseInterceptors(encryptedUpload) createVersion(@Req() request: Request, @Param("documentId") documentId: string, @Body() input: CreateVersionDto, @UploadedFile() file: Express.Multer.File) { return this.documents.createVersion(request.user!, documentId, input, file); }
  @Get(":documentId/viewer") viewer(@Req() request: Request, @Param("documentId") documentId: string) { return this.documents.viewerAccess(request.user!, documentId); }
  @Post(":documentId/onlyoffice-session") onlyoffice(@Req() request: Request, @Param("documentId") documentId: string) { return this.documents.trustedEditorConfig(request.user!, documentId); }
}
