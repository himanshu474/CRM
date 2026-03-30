import { createClient } from "redis";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

// ✅ Fail fast at startup if Redis URL is missing — don't silently disable
// caching and queues, which leads to hard-to-debug production issues.
// If you genuinely want Redis to be optional, keep the warn but make every
// consumer check for null before using redisClient / bullConnection.
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
        console.error("❌ Redis: Max reconnection attempts reached. Giving up.");
        return new Error("Redis reconnection failed after 10 attempts");
      }
      const delay = Math.min(retries * 100, 3000);
      console.warn(`⚠️  Redis: Reconnecting in ${delay}ms (attempt ${retries})...`);
      return delay;
    },
  },
});

redisClient.on("error",        (err) => console.error("❌ Redis Cache Error:", err));
redisClient.on("ready",        ()    => console.log("✅ Redis Cache: Ready"));
redisClient.on("reconnecting", ()    => console.warn("⚠️  Redis Cache: Reconnecting..."));
// ✅ Added 'end' event — fires when Redis gives up reconnecting entirely
redisClient.on("end",          ()    => console.error("❌ Redis Cache: Connection closed permanently"));

// ─────────────────────────────────────────────
// 2. IORedis Client (BullMQ — requires ioredis + maxRetriesPerRequest: null)
// ─────────────────────────────────────────────

export const bullConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,   // ✅ Required by BullMQ — do not change
  connectTimeout:       10000,
  enableReadyCheck:     false,  // ✅ Required by BullMQ — prevents startup race condition
  // ✅ lazyConnect: true — don't connect until first command is issued.
  // Without this, the process crashes at import time if Redis is temporarily down.
  lazyConnect:          true,
});

bullConnection.on("error",   (err) => console.error("❌ BullMQ Redis Error:", err));
bullConnection.on("ready",   ()    => console.log("✅ BullMQ Redis: Ready"));
bullConnection.on("close",   ()    => console.warn("⚠️  BullMQ Redis: Connection closed"));

// ─────────────────────────────────────────────
// connectRedis — call once from server entry point
// ─────────────────────────────────────────────

export const connectRedis = async (): Promise<void> => {
  // node-redis requires explicit .connect()
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  // ioredis connects lazily — explicitly connect so we know it's ready at startup
  if (bullConnection.status === "wait" || bullConnection.status === "close") {
    await bullConnection.connect();
  }

  console.log("✅ Redis: All connections established");
};

export default redisClient;