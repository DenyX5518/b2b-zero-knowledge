import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module.js";
import { DeviceEntity, RecoveryApprovalEntity, RecoveryCeremonyEntity } from "../database/entities.js";
import { RecoveryController } from "./recovery.controller.js";
import { RecoveryService } from "./recovery.service.js";

@Module({ imports: [TypeOrmModule.forFeature([RecoveryCeremonyEntity, RecoveryApprovalEntity, DeviceEntity]), AuditModule], controllers: [RecoveryController], providers: [RecoveryService] })
export class RecoveryModule {}
