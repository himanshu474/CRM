import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

/**
 * PRODUCTION CONFIG: 
 * Using pg pool directly with Prisma Adapter gives 
 * much better control over connections than the default binary.
 */
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max simultaneous connections
  idleTimeoutMillis: 30000, // How long a client can sit idle before being closed
  connectionTimeoutMillis: 10000, // How long to wait for a connection before failing
});

// 🔥 CRITICAL: Handle errors on idle clients to prevent the process from crashing
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

const adapter = new PrismaPg(pool);

let prisma: PrismaClient;

/**
 * SINGLETON PATTERN: 
 * Prevents creating new connections on every Hot Reload (Dev) 
 * or every request (Prod).
 */
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

if (!global.prismaGlobal) {
  prisma = new PrismaClient({
    adapter,
    // In production, we usually only log warnings and errors to keep logs clean
    log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["query", "error", "warn"],
  });

  global.prismaGlobal = prisma;
} else {
  prisma = global.prismaGlobal;
}

/**
 * CONNECT DB: 
 * Used in server startup (app.ts) to ensure DB is ready before listening.
 * The retry mechanism is better for UX as it prevents the container 
 * from failing if the DB is just 2 seconds slower than the API.
 */
export const connectDB = async () => {
  let retries = MAX_RETRIES;

  while (retries > 0) {
    try {
      await prisma.$connect();
      console.log("Database connected successfully");
      break;
    } catch (error) {
      retries--;
      console.error(`DB connection failed. Retries left: ${retries}`);

      if (retries === 0) {
        console.error("All DB connection retries exhausted. Shutting down...");
        throw error;
      }

      // Wait before trying again
      await new Promise((res) => setTimeout(res, RETRY_DELAY));
    }
  }
};

/**
 * GRACEFUL SHUTDOWN: 
 * Use this in your server's shutdown logic to release pool clients.
 */
export const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    await pool.end();
    console.log("Database connections closed gracefully");
  } catch (error) {
    console.error("Error during DB disconnection", error);
  }
};

export default prisma;
