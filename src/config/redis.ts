// src/config/redis.ts
import { createClient } from "redis";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error(
    "REDIS_URL environment variable is not set. " +
    "Redis is required for caching, session storage, and job queues."
  );
}

// ─────────────────────────────────────────────
// 1. Node-Redis Client (caching, general KV)
// ─────────────────────────────────────────────

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis: Max reconnection attempts reached. Giving up.");
        return false;
      }
      const delay = Math.min(retries * 100, 3000);
      console.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})...`);
      return delay;
    },
  },
});

redisClient.on("error",        (err) => console.error("Redis Cache Error:", err));
redisClient.on("ready",        ()    => console.log("Redis Cache: Ready"));
redisClient.on("reconnecting", ()    => console.warn("Redis Cache: Reconnecting..."));
redisClient.on("end",          ()    => console.error("Redis Cache: Connection closed permanently"));

// ─────────────────────────────────────────────
// 2. BullMQ Connection Factory
// Each Queue and Worker must get its own ioredis instance.
// Sharing one connection across multiple BullMQ consumers causes
// "connection already subscribed" errors at runtime.
// ─────────────────────────────────────────────

export const createBullConnection = (): Redis =>
  new Redis(redisUrl!, {
    maxRetriesPerRequest: null,  // Required by BullMQ — do not change
    connectTimeout:       10000,
    enableReadyCheck:     false, // Required by BullMQ — prevents startup race condition
    lazyConnect:          true,  // Do not crash at import if Redis is briefly unavailable
  });

// ─────────────────────────────────────────────
// 3. connectRedis — call once from server.ts at startup
// ─────────────────────────────────────────────

export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    throw new Error(`Redis cache connection failed: ${err}`);
  }

  console.log("Redis: All connections established");
};

// ─────────────────────────────────────────────
// 4. disconnectRedis — call from server.ts graceful shutdown handler
// Without this the process hangs for several seconds on SIGTERM
// because node-redis keeps its socket open.
// ─────────────────────────────────────────────

export const disconnectRedis = async (): Promise<void> => {
  await redisClient.quit();
  console.log("Redis: All connections closed");
};

export default redisClient;