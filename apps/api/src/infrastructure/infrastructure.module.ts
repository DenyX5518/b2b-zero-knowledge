import { Global, Module } from "@nestjs/common";
import { HsmService } from "./hsm.service.js";
import { ObjectStorageService } from "./object-storage.service.js";
import { RedisService } from "./redis.service.js";

@Global()
@Module({ providers: [RedisService, ObjectStorageService, HsmService], exports: [RedisService, ObjectStorageService, HsmService] })
export class InfrastructureModule {}
