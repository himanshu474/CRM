import express from "express";
import cors from "cors";
import helmet from "helmet";

// Routes imports
import userRoutes from "./routes/user.routes.js";
import workspaceRoutes from "./routes/workspace.route.js";
import projectRoutes from "./routes/project.route.js";
import taskRoutes from "./routes/task.route.js"; 
import activityRoutes from "./routes/activity.route.js"; 
import attachmentRoutes from "./routes/attachment.route.js"
import { globalErrorHandler } from "./middlewares/error.middleware.js";
import { AppError } from "./utils/AppError.js";

const app = express();

// 1. Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// 2. Routes Mounting
app.use("/api/users", userRoutes); 
app.use("/api/workspaces", workspaceRoutes); 
/** 
 * IMPORTANT: We mount Project, Task, and Activity under /api/workspaces.
 * This means every route in these files will START with /api/workspaces.
 * Example: /api/workspaces/:workspaceId/projects
 */
app.use("/api/workspaces", projectRoutes);
app.use("/api/workspaces", taskRoutes); 
app.use("/api/workspaces", activityRoutes); 
app.use("/api", attachmentRoutes);  // <-- add this line


//  Health Check
app.get("/health", (req, res) => {
    res.json({ status: "success", message: "Server running successfully!" });
});

// Hamesha saari routes ke BAAD rakhein
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//Global Error Handler (ONLY ONCE & AT THE END)
app.use(globalErrorHandler);

export default app;
