import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

// Route Imports
import authRoutes from "./routes/auth.route.js";
import workspaceRoutes from "./routes/workspace.route.js";
import projectRoutes from "./routes/project.route.js";
import taskRoutes from "./routes/task.route.js"; 
import activityRoutes from "./routes/activity.route.js"; 
import attachmentRoutes from "./routes/attachment.route.js";
import taskDependencyRoutes from "./routes/dependency.route.js";
import companyRoutes from "./routes/company.route.js";
import contactRoutes from "./routes/contact.route.js";
import dealRoutes from "./routes/deal.route.js";

import { globalErrorHandler } from "./middlewares/error.middleware.js";
import { AppError } from "./utils/AppError.js";

const app = express();

// 1. GLOBAL MIDDLEWARES
app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true 
}));
app.use(express.json());

// 2. ROUTES MOUNTING
app.use("/api/users", authRoutes); 
app.use("/api/workspaces", workspaceRoutes); 

// Workspace Sub-Resources
app.use("/api/workspaces", projectRoutes);
app.use("/api/workspaces", taskRoutes); 
app.use("/api/workspaces", activityRoutes); 
app.use("/api/workspaces", attachmentRoutes);  
app.use("/api/workspaces", taskDependencyRoutes);

// CRM Specific Resources
app.use("/api/workspaces", companyRoutes);
app.use("/api/workspaces", contactRoutes);
app.use("/api/workspaces", dealRoutes);

// 3. HEALTH CHECK
app.get("/health", (req, res) => {
    res.json({ status: "success", message: "CRM Server is healthy!" });
});

// 4. 404 HANDLER
app.all("*", (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found!`, 404));
});

// 5. GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

export default app;
