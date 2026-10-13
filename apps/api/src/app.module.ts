import { APP_GUARD } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ALL_ENTITIES, DeviceEntity, EmployeeEntity, OrganizationEntity, RoomEntity, RoomMemberEntity } from "./database/entities.js";
import { InfrastructureModule } from "./infrastructure/infrastructure.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { AccessTokenGuard, RoleGuard } from "./auth/auth.guards.js";
import { AuditModule } from "./audit/audit.module.js";
import { ChatsModule } from "./chats/chats.module.js";
import { DocumentsModule } from "./documents/documents.module.js";
import { RecoveryModule } from "./recovery/recovery.module.js";
import { DevicesModule } from "./devices/devices.module.js";
import { HealthController } from "./health.controller.js";
import { SeedService } from "./seed.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", "../../.env"] }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ type: "postgres", url: config.get("DATABASE_URL"), entities: ALL_ENTITIES, synchronize: config.get("DB_SYNC", "false") === "true", logging: config.get("DB_LOGGING", "false") === "true", ssl: config.get("DB_SSL", "false") === "true" ? { rejectUnauthorized: true } : false }) }),
    TypeOrmModule.forFeature([OrganizationEntity, EmployeeEntity, DeviceEntity, RoomEntity, RoomMemberEntity]),
    InfrastructureModule, AuthModule, AuditModule, ChatsModule, DocumentsModule, RecoveryModule, DevicesModule
  ],
  controllers: [HealthController],
  providers: [SeedService, { provide: APP_GUARD, useExisting: AccessTokenGuard }, { provide: APP_GUARD, useExisting: RoleGuard }]
})
export class AppModule {}
