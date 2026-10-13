import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { ChatService } from "./chat.service.js";

@Controller("rooms")
export class ChatController {
  constructor(private readonly chats: ChatService) {}
  @Get() list(@Req() request: Request) { return this.chats.listRooms(request.user!); }
  @Get(":roomId/messages") history(@Req() request: Request, @Param("roomId") roomId: string, @Query("cursor") cursor?: string) { return this.chats.history(request.user!, roomId, cursor); }
}
