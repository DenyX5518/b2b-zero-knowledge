import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  constructor(config: ConfigService) {
    this.client = new Redis(config.get<string>("REDIS_URL", "redis://127.0.0.1:6379"), { lazyConnect: true, maxRetriesPerRequest: 2 });
  }
  async ready(): Promise<void> { if (this.client.status === "wait") await this.client.connect(); }
  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> { await this.ready(); await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds); }
  async takeJson<T>(key: string): Promise<T | null> { await this.ready(); const value = await this.client.getdel(key); return value ? JSON.parse(value) as T : null; }
  async consumeLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    await this.ready();
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, windowSeconds);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  }
  async clear(key: string): Promise<void> { await this.ready(); await this.client.del(key); }
  async onModuleDestroy(): Promise<void> { if (this.client.status !== "end") await this.client.quit(); }
}
