import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module.js";
import { DeviceEntity, RefreshSessionEntity } from "../database/entities.js";
import { DevicesController } from "./devices.controller.js";
import { DevicesService } from "./devices.service.js";

@Module({ imports: [TypeOrmModule.forFeature([DeviceEntity, RefreshSessionEntity]), AuditModule], controllers: [DevicesController], providers: [DevicesService] })
export class DevicesModule {}
