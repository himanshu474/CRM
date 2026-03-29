import { AppError } from "../AppError.js";
import { ERROR_MESSAGES } from "../../constants/errorMessages.js";

// 5MB limit
const MAX_FILE_SIZE = 5 * 1024 * 1024; 

// CRM specific types (Added PDF, DOCX, and XLSX)
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",      // .xlsx
];

/**
 * Validate file before upload
 */
export const validateFile = (file: Express.Multer.File) => {
  if (!file) {
    throw new AppError(ERROR_MESSAGES.COMMON.BAD_REQUEST, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(ERROR_MESSAGES.FILE.TOO_LARGE, 400);
  }

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError(ERROR_MESSAGES.FILE.INVALID_TYPE, 400);
  }
};
