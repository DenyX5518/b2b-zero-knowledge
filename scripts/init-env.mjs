// Создаёт .env из .env.example и подставляет свежие случайные секреты.
// Так .env не нужно переносить между машинами: на каждой он генерируется заново.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const target = new URL(".env", root);
const force = process.argv.includes("--force");

if (existsSync(target) && !force) {
  console.log(".env уже существует — оставляю как есть. Перезаписать: npm run env:init -- --force");
  console.log("Внимание: после смены POSTGRES_PASSWORD существующий Docker-том PostgreSQL нужно пересоздать (npm run infra:down -- -v).");
  process.exit(0);
}

const secret = (bytes) => randomBytes(bytes).toString("base64url");
const generated = {
  POSTGRES_PASSWORD: secret(24),
  MINIO_SECRET_KEY: secret(24),
  JWT_ACCESS_SECRET: secret(48),
  ONLYOFFICE_JWT_SECRET: secret(32)
};

let text = readFileSync(new URL(".env.example", root), "utf8");
for (const [key, value] of Object.entries(generated)) text = text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
text = text.replace(/^DATABASE_URL=postgres:\/\/kontur:[^@]*@/m, `DATABASE_URL=postgres://kontur:${generated.POSTGRES_PASSWORD}@`);

writeFileSync(target, `# Сгенерировано scripts/init-env.mjs ${new Date().toISOString()}. Не коммитьте этот файл.\n${text}`);
console.log(".env создан со случайными секретами. Демо-вход остаётся admin@aktau-industrial.kz / demo-2026.");
