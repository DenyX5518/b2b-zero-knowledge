import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { ApproveRecoveryDto, StartRecoveryDto } from "./recovery.dto.js";
import { RecoveryService } from "./recovery.service.js";

@Controller("recovery")
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}
  @Post("ceremonies") start(@Req() request: Request, @Body() input: StartRecoveryDto) { return this.recovery.start(request.user!, input); }
  @Post("ceremonies/:id/approvals") approve(@Req() request: Request, @Param("id") id: string, @Body() input: ApproveRecoveryDto) { return this.recovery.approve(request.user!, id, input); }
  @Get("ceremonies/:id/bundle") bundle(@Req() request: Request, @Param("id") id: string) { return this.recovery.bundle(request.user!, id); }
}
