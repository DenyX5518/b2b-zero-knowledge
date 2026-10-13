import { Controller, Get } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Public } from "./auth/auth.decorators.js";
import { RedisService } from "./infrastructure/redis.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly dataSource: DataSource, private readonly redis: RedisService) {}
  @Public() @Get("live") live() { return { status: "ok", service: "kontur-api", plaintextStorage: false }; }
  @Public() @Get("ready") async ready() { await this.dataSource.query("SELECT 1"); await this.redis.ready(); return { status: "ready", postgres: "up", redis: "up" }; }
}
