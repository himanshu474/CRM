// src/config/socket.ts
import { Server }                from "socket.io";
import type { Server as HTTPServer } from "http";
import { verifyAccessToken }     from "../utils/auth/token.utils.js";
import prisma               from "./prisma.js";

let io: Server;

// ─────────────────────────────────────────────
// initSocket — call once from server.ts
// ─────────────────────────────────────────────

export const initSocket = (server: HTTPServer): Server => {
  io = new Server(server, {
    cors: {
      origin:      process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Auth handshake — unauthenticated sockets never reach the connection handler
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = verifyAccessToken(token);
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user?.id as string;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

    // join_workspace
    // Validates membership before joining — without this any authenticated
    // user could subscribe to real-time events of any workspace
    socket.on("join_workspace", async (workspaceId: string) => {
      try {
        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
        });

        if (!membership) {
          socket.emit("error", {
            message: "Access denied: not a member of this workspace",
          });
          return;
        }

        socket.join(workspaceId);
        console.log(`User ${userId} joined room: ${workspaceId}`);
      } catch {
        socket.emit("error", { message: "Failed to join workspace room" });
      }
    });

    // leave_workspace
    // Also emit "member_removed" from workspace.service.ts when a member
    // is removed server-side so the client knows to call this event
    socket.on("leave_workspace", (workspaceId: string) => {
      socket.leave(workspaceId);
      console.log(`User ${userId} left room: ${workspaceId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// ─────────────────────────────────────────────
// getIO — use in controllers, services, and queue workers
// to emit real-time events
//
// Usage:
//   getIO().to(workspaceId).emit("task_created", task);
// ─────────────────────────────────────────────

export const getIO = (): Server => {
  if (!io) {
    throw new Error(
      "Socket.io not initialized. Call initSocket() from server.ts first."
    );
  }
  return io;
};