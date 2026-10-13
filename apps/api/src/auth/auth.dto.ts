import { IsEmail, IsOptional, IsString, IsUUID, Length, MaxLength } from "class-validator";

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @Length(8, 200) password!: string;
  @IsString() @Length(8, 200) deviceId!: string;
  @IsString() @MaxLength(120) deviceName!: string;
  @IsOptional() @IsString() publicEncryptionKey?: string;
  @IsOptional() @IsString() publicSigningKey?: string;
}

export class RefreshDto { @IsString() refreshToken!: string; }
export class PasskeyEmailDto { @IsEmail() email!: string; }
export class PasskeyDeviceDto { @IsUUID() deviceRecordId!: string; @IsString() response!: string; }
