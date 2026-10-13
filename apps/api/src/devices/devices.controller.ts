import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../auth/auth.decorators.js";
import { EmployeeRole } from "../database/entities.js";
import { DevicesService } from "./devices.service.js";

@Controller("devices")
@Roles(EmployeeRole.ADMIN, EmployeeRole.SECURITY)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}
  @Get() list(@Req() request: Request) { return this.devices.list(request.user!); }
  @Post(":id/approve") approve(@Req() request: Request, @Param("id") id: string) { return this.devices.approve(request.user!, id); }
  @Post(":id/revoke") revoke(@Req() request: Request, @Param("id") id: string) { return this.devices.revoke(request.user!, id); }
}
