import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly client: S3Client;
  private readonly bucket: string;
  constructor(config: ConfigService) {
    this.bucket = config.get("MINIO_BUCKET", "kontur-ciphertext");
    const secure = config.get("MINIO_USE_SSL", "false") === "true";
    this.client = new S3Client({
      endpoint: `${secure ? "https" : "http"}://${config.get("MINIO_ENDPOINT", "127.0.0.1")}:${Number(config.get("MINIO_PORT", 9000))}`,
      region: config.get("MINIO_REGION", "us-east-1"),
      forcePathStyle: true,
      credentials: { accessKeyId: config.get("MINIO_ACCESS_KEY", "kontur"), secretAccessKey: config.get("MINIO_SECRET_KEY", "change-me-now") }
    });
  }
  async onModuleInit(): Promise<void> {
    try { await this.client.send(new HeadBucketCommand({ Bucket: this.bucket })); }
    catch { await this.client.send(new CreateBucketCommand({ Bucket: this.bucket })); }
  }
  async putCiphertext(objectKey: string, buffer: Buffer, contentType = "application/octet-stream"): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, Body: buffer, ContentLength: buffer.length, ContentType: contentType, Metadata: { plaintext: "never" } }));
  }
  async getCiphertext(objectKey: string): Promise<Buffer> {
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    return Buffer.from(await object.Body!.transformToByteArray());
  }
  async presignedCiphertext(objectKey: string, expiresSeconds = 300): Promise<string> { return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }), { expiresIn: expiresSeconds }); }
}
