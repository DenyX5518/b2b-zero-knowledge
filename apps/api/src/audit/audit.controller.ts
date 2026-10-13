import { Controller, Get, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { EmployeeRole } from "../database/entities.js";
import { Roles } from "../auth/auth.decorators.js";
import { AuditService } from "./audit.service.js";

@Controller("audit")
@Roles(EmployeeRole.ADMIN, EmployeeRole.SECURITY)
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get() list(@Req() request: Request, @Query("limit") limit?: string) { return this.audit.list(request.user!.tenantId, Number(limit ?? 200)); }
  @Get("verify") verify(@Req() request: Request) { return this.audit.verify(request.user!.tenantId); }
}
