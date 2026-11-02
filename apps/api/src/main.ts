import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  // Зашифрованные документы с историей версий синхронизируются JSON-ом и бывают больше 100 КБ по умолчанию.
  app.useBodyParser("json", { limit: "4mb" });
  const config = app.get(ConfigService);
  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();
  app.enableCors({ origin: config.get("WEB_ORIGIN", "http://127.0.0.1:4173").split(","), credentials: false, methods: ["GET", "POST", "PATCH", "DELETE"] });
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" }, referrerPolicy: { policy: "no-referrer" } }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: false }));
  await app.listen(Number(config.get("PORT", 3001)), "0.0.0.0");
}

await bootstrap();
