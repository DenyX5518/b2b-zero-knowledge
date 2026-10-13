import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageEntity, RoomEntity, RoomMemberEntity } from "../database/entities.js";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ChatController } from "./chat.controller.js";
import { ChatGateway } from "./chat.gateway.js";
import { ChatService } from "./chat.service.js";

@Module({ imports: [TypeOrmModule.forFeature([MessageEntity, RoomEntity, RoomMemberEntity]), AuditModule, AuthModule], controllers: [ChatController], providers: [ChatService, ChatGateway] })
export class ChatsModule {}
