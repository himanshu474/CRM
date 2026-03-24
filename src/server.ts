import 'dotenv/config'; 
import { createServer } from "http"; // Required for Socket.io
import app from "./app.js";
import prisma, { connectDB } from "./config/prisma.js";
import { connectRedis } from "./config/redis.js";
import { connectEmail } from "./config/email.js";
import { initSocket } from "./config/socketio.js";

const PORT = process.env.PORT || 5000;

// 1. Create HTTP Server by wrapping the Express app
const httpServer = createServer(app);

const startServer = async () => {
    try {
        console.log("Initializing CRM Services...");

        // 2. Connect Infrastructure
        await connectDB();    // PostgreSQL
        await connectRedis(); // Redis
        await connectEmail(); // SMTP

        // 3. Initialize Socket.io with the HTTP server
        initSocket(httpServer);

        // 4. Start Listening using httpServer (NOT app.listen)
        httpServer.listen(PORT, () => {
            console.log(`CRM Server & Socket.io running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Critical startup error:", error);
        process.exit(1); 
    }
};

startServer();

/**
 * GRACEFUL SHUTDOWN
 * Cleanup database connections when server stops
 */
process.on("SIGINT", async () => {
    console.log("\n Closing connections...");
    await prisma.$disconnect();
    process.exit(0);
});
