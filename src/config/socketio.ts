import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/auth/token.utils.js";
// import { AppError } from "../utils/AppError.js";

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // 1. Auth Middleware: Sirf valid token wale connect honge
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: No token provided"));

      const decoded = verifyAccessToken(token);
      // User data ko socket mein save kar liya for later use
      socket.data.user = decoded; 

      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user?.id;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

    // 2. Workspace Rooms (CRM ke liye zaroori)
    socket.on("join_workspace", (workspaceId: string) => {
      socket.join(workspaceId);
      console.log(`User ${userId} joined room: ${workspaceId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * 3. Global Access: Isse aap Deal/Task controller mein
 * real-time updates bhej sakte hain.
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
