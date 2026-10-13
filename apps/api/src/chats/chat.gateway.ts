import { JwtService } from "@nestjs/jwt";
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import type { AccessClaims } from "../auth/auth.types.js";
import { ChatService } from "./chat.service.js";
import type { EncryptedMessageDto, JoinRoomDto } from "./chat.dto.js";

type AuthenticatedSocket = Socket & { data: { user?: AccessClaims } };

@WebSocketGateway({ namespace: "/realtime", cors: { origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://127.0.0.1:4173"], credentials: false }, transports: ["websocket"] })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(private readonly jwt: JwtService, private readonly chats: ChatService) {}

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    try {
      const user = await this.jwt.verifyAsync<AccessClaims>(token);
      if (user.type !== "access") throw new Error("Wrong token type");
      socket.data.user = user;
      await socket.join(`tenant:${user.tenantId}:employee:${user.sub}`);
    } catch { socket.disconnect(true); }
  }

  @SubscribeMessage("room:join")
  async join(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() input: JoinRoomDto) {
    const user = socket.data.user;
    if (!user) throw new WsException("Unauthenticated");
    await this.chats.assertMember(user, input.roomId);
    await socket.join(`tenant:${user.tenantId}:room:${input.roomId}`);
    return { event: "room:joined", data: { roomId: input.roomId } };
  }

  @SubscribeMessage("message:send")
  async send(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() input: EncryptedMessageDto) {
    const user = socket.data.user;
    if (!user) throw new WsException("Unauthenticated");
    const message = await this.chats.store(user, input);
    this.server.to(`tenant:${user.tenantId}:room:${input.roomId}`).emit("message:created", message);
    return { event: "message:accepted", data: { clientMessageId: input.clientMessageId, serverMessageId: message.id } };
  }
}
