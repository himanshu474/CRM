// src/middlewares/upload.middleware.ts
import multer from "multer";
import { AppError } from "../utils/AppError.js";

const storage = multer.memoryStorage();

const allowedTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new AppError("Invalid file type", 400));
    }
    cb(null, true);
  },
});