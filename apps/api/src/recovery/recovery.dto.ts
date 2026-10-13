import { IsBase64, IsInt, IsString, Length, Max, Min } from "class-validator";

export class StartRecoveryDto {
  @IsString() @Length(32, 10_000) workstationPublicKey!: string;
  @IsInt() @Min(2) @Max(5) threshold = 2;
  @IsInt() @Min(3) @Max(7) total = 3;
}

export class ApproveRecoveryDto {
  @IsString() @Length(32, 100_000) encryptedShareEnvelope!: string;
  @IsBase64() deviceSignature!: string;
}
