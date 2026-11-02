import { IsBase64, IsIn, IsInt, IsJSON, IsOptional, IsString, Length, Max, MaxLength, Min } from "class-validator";

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

// Версия текстового документа, зашифрованная на клиенте: payload — DEK, DEK обёрнут ключом организации.
export class SyncDocumentVersionDto {
  @IsInt() @Min(0) baseVersion!: number;
  @IsInt() @Min(1) @Max(1_000_000) version!: number;
  @IsString() @Length(24, 4_000) wrappedDek!: string;
  @IsBase64() nonce!: string;
  @IsBase64() aad!: string;
  @IsBase64() @Length(24, 3_000_000) ciphertext!: string;
}
