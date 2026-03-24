export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: "Invalid email or password",
    NOT_AUTHORIZED: "You are not authorized to access this resource",
    SESSION_EXPIRED: "Your session has expired. Please log in again",
    SESSION_REVOKED: "This session has been revoked for security",
    EMAIL_NOT_VERIFIED: "Please verify your email to continue",
    INVALID_TOKEN: "The provided token is invalid",
    TOKEN_EXPIRED: "The token has expired",
    INSUFFICIENT_PERMISSIONS: "You do not have the required permissions for this action",
    TOO_MANY_SESSIONS: "Maximum session limit reached. Please logout from other devices",
  },

  USER: {
    NOT_FOUND: "User not found",
    EMAIL_EXISTS: "An account with this email already exists",
    NOT_IN_WORKSPACE: "This user is not a member of the workspace",
  },

  WORKSPACE: {
    NOT_FOUND: "Workspace not found or has been deleted",
    ACCESS_DENIED: "You do not have access to this workspace",
    MEMBER_NOT_FOUND: "Workspace member record not found",
    ALREADY_MEMBER: "User is already a member of this workspace",
  },

  PROJECT: {
    NOT_FOUND: "Project not found in this workspace",
    OWNER_ONLY: "Only the project owner can perform this action",
  },

  TASK: {
    NOT_FOUND: "Task not found in this workspace",
    BLOCKED: "Task is blocked by unfinished dependencies",
    CYCLIC_DEPENDENCY: "Circular dependency detected: A task cannot depend on itself or its successors",
    ALREADY_DELETED: "This task has already been deleted",
    UPDATE_FAILED: "Failed to update task",
  },

  FILE: {
    INVALID_TYPE: "Invalid file type. Please upload a supported format",
    TOO_LARGE: "File size exceeds the allowed limit",
    UPLOAD_FAILED: "File upload failed",
    NOT_FOUND: "Attachment not found",
  },

  COMMON: {
    SERVER_ERROR: "An internal server error occurred",
    VALIDATION_ERROR: "Validation failed for the provided data",
    BAD_REQUEST: "The request could not be understood by the server",
    RESOURCE_NOT_FOUND: "The requested resource was not found",
    DUPLICATE_FIELD: "A record with this value already exists",
  },
} as const;

export type ErrorMessageType = typeof ERROR_MESSAGES;
