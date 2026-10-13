import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { MessageEntity, RoomEntity, RoomMemberEntity } from "../database/entities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AccessClaims } from "../auth/auth.types.js";
import type { EncryptedMessageDto } from "./chat.dto.js";

@Injectable()
export class ChatService {
  constructor(@InjectRepository(MessageEntity) private readonly messages: Repository<MessageEntity>, @InjectRepository(RoomEntity) private readonly rooms: Repository<RoomEntity>, @InjectRepository(RoomMemberEntity) private readonly members: Repository<RoomMemberEntity>, private readonly audit: AuditService) {}

  async listRooms(user: AccessClaims): Promise<RoomEntity[]> {
    const memberships = await this.members.find({ where: { tenantId: user.tenantId, employeeId: user.sub }, take: 500 });
    if (!memberships.length) return [];
    return this.rooms.find({ where: { tenantId: user.tenantId, id: In(memberships.map((membership) => membership.roomId)) }, order: { updatedAt: "DESC" } });
  }

  async assertMember(user: AccessClaims, roomId: string): Promise<void> {
    if (!await this.members.existsBy({ tenantId: user.tenantId, roomId, employeeId: user.sub })) throw new ForbiddenException("Room membership required");
  }

  async store(user: AccessClaims, input: EncryptedMessageDto): Promise<MessageEntity> {
    await this.assertMember(user, input.roomId);
    const message = await this.messages.save(this.messages.create({ tenantId: user.tenantId, roomId: input.roomId, senderId: user.sub, senderDeviceId: user.deviceId, clientMessageId: input.clientMessageId, ciphertext: input.ciphertext, nonce: input.nonce, aad: input.aad, keyEpoch: input.keyEpoch, editedAt: null, deletedAt: null }));
    await this.audit.append({ tenantId: user.tenantId, actorId: user.sub, action: "message.created", targetRef: `room:${input.roomId}/message:${message.id}`, safeMetadata: { keyEpoch: input.keyEpoch, ciphertextBytes: input.ciphertext.length } });
    return message;
  }

  async history(user: AccessClaims, roomId: string, cursor?: string): Promise<MessageEntity[]> {
    await this.assertMember(user, roomId);
    const query = this.messages.createQueryBuilder("message").where("message.tenantId = :tenantId AND message.roomId = :roomId", { tenantId: user.tenantId, roomId }).orderBy("message.createdAt", "DESC").take(100);
    if (cursor) query.andWhere("message.createdAt < :cursor", { cursor: new Date(cursor) });
    return (await query.getMany()).reverse();
  }
}
