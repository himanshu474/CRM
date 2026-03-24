import { createClient } from "redis";
// import { AppError } from "../utils/AppError.js";

/**
 * REDIS_URL will be from Upstash (redis://...) 
 * or Docker (redis://localhost:6379) later.
 */
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  // We don't crash the server, just warn. 
  // CRM can still work with Postgres even if Cache is down.
  console.warn("REDIS_URL is missing. Caching features will be disabled.");
}

const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 10000, // 10 seconds wait before giving up
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error("Redis reconnection failed");
      return Math.min(retries * 100, 3000); // Wait longer between each retry
    },
  },
});

// Event Listeners for health monitoring
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log(" Redis attempting to connect...");
});

redisClient.on("ready", () => {
  console.log("Redis is ready and connected!");
});

/**
 * Connect function to be called in your main entry file (app.ts/index.ts)
 */
export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen && redisUrl) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error("Failed to initialize Redis:", err);
  }
};

export default redisClient;
