import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { webhookRouter} from "./routes/payment.route.js";
import routes from "./routes/index.js";
import { globalErrorHandler } from "./middlewares/error.middleware.js";
import { AppError } from "./utils/AppError.js";

const app = express();

// ✅ 1. Global Middlewares (Security first)
app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true 
}));

// ✅ 2. BODY PARSING MIDDLEWARE - MUST BE BEFORE ANY ROUTES THAT NEED IT
app.use(express.json());        // ← MOVED HERE (before routes)
app.use(express.urlencoded({ extended: true })); // ← MOVED HERE

// ✅ 3. Webhook routes (needs raw body, so handle BEFORE express.json for this specific route)
// Note: For Stripe webhooks, you might want to keep raw body. If so, use:
// app.use("/api/webhooks", express.raw({type: 'application/json'}), webhookRouter);
// But for now, keep it simple:
app.use("/api/webhooks", webhookRouter);

// ✅ 4. API Routes
app.use("/api", routes);

// ✅ 5. Health Check
app.get("/health", (req, res) => {
    res.json({ status: "success", message: "CRM Server is healthy" });
});

// ✅ 6. 404 Handler - 🔥 FIXED FOR EXPRESS 5
app.all("/*splat", (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// ✅ 7. Global Error Middleware
app.use(globalErrorHandler);

export default app;