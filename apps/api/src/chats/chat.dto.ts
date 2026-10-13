import { IsBase64, IsInt, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class EncryptedMessageDto {
  @IsUUID() roomId!: string;
  @IsUUID() clientMessageId!: string;
  @IsString() @Length(24, 2_000_000) ciphertext!: string;
  @IsBase64() nonce!: string;
  @IsBase64() aad!: string;
  @IsInt() @Min(1) @Max(2_147_483_647) keyEpoch!: number;
}

export class JoinRoomDto { @IsUUID() roomId!: string; }
