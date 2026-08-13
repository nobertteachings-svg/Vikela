import IORedis from "ioredis";

function requireVar(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`${name} is required in production`);
  }
  return value.trim();
}

function assertProductionUrl(name: string, value: string): void {
  if (value.includes("localhost") || value.includes("127.0.0.1")) {
    throw new Error(
      `${name} must be your public Railway URL in production (got ${value}). Set it on the API service.`
    );
  }
  if (value.endsWith("/api/v1") || value.endsWith("/api")) {
    throw new Error(`${name} must not include /api or /api/v1 (got ${value})`);
  }
}

function assertDatabaseUrl(name: string, value: string): void {
  if (value.includes("localhost") || value.includes("127.0.0.1")) {
    throw new Error(
      `${name} must point at your Railway Postgres service in production (got localhost). Use DATABASE_URL=\${{Postgres.DATABASE_URL}}`
    );
  }
}

function assertRedisUrl(value: string): void {
  if (value.includes("localhost") || value.includes("127.0.0.1")) {
    throw new Error(
      `REDIS_URL must point at your Railway Redis service in production (got localhost). Use REDIS_URL=\${{Redis.REDIS_URL}}`
    );
  }
}

/** Fail fast when API production wiring is incomplete. */
export function validateApiProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const databaseUrl = requireVar("DATABASE_URL", process.env.DATABASE_URL);
  const directUrl = requireVar("DIRECT_URL", process.env.DIRECT_URL);
  const redisUrl = requireVar("REDIS_URL", process.env.REDIS_URL);
  const appUrl = requireVar("APP_URL", process.env.APP_URL);

  assertDatabaseUrl("DATABASE_URL", databaseUrl);
  assertDatabaseUrl("DIRECT_URL", directUrl);
  assertRedisUrl(redisUrl);
  assertProductionUrl("APP_URL", appUrl);

  if (!process.env.CORS_ALLOWED_ORIGINS?.trim()) {
    console.warn(
      "CORS_ALLOWED_ORIGINS is not set, only APP_URL will be allowed. Set CORS_ALLOWED_ORIGINS to your Web Railway URL."
    );
  }
}

/** Verify Postgres and Redis are reachable before accepting traffic. */
export async function assertApiConnectivity(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const { prisma } = await import("./prisma.js");
  await prisma.$queryRaw`SELECT 1`;

  const redisUrl = requireVar("REDIS_URL", process.env.REDIS_URL);
  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 10_000,
    lazyConnect: true,
  });
  try {
    await redis.connect();
    await redis.ping();
  } finally {
    redis.disconnect();
  }
}
