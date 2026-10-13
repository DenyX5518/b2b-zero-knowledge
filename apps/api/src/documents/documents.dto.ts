import { IsBase64, IsIn, IsJSON, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateDocumentDto {
  @IsString() @Length(24, 100_000) encryptedMetadata!: string;
  @IsString() @Length(24, 100_000) wrappedDek!: string;
  @IsString() @Length(32, 256) contentHash!: string;
  @IsString() @MaxLength(200) mimeType!: string;
  @IsOptional() @IsIn(["internal", "confidential", "restricted"]) classification?: string;
  @IsOptional() @IsJSON() policy?: string;
  @IsOptional() @IsString() crdtStateVector?: string;
}

export class CreateVersionDto {
  @IsString() @Length(24, 100_000) wrappedDek!: string;
  @IsString() @Length(32, 256) contentHash!: string;
  @IsString() @MaxLength(200) mimeType!: string;
  @IsOptional() @IsString() crdtStateVector?: string;
}
