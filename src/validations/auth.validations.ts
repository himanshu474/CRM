import { z } from "zod";
import { TaskStatus, TaskPriority, WorkspaceRole } from "@prisma/client";

const emailBase = z
  .string()
  .trim()
  .email("Invalid email format")
  .toLowerCase();

const passwordBase = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password exceeds maximum length")
  .regex(/[A-Z]/, "At least one uppercase letter required")
  .regex(/[a-z]/, "At least one lowercase letter required")
  .regex(/[0-9]/, "At least one numeric digit required")
  .regex(/[^A-Za-z0-9]/, "At least one special character required");

const cuidBase = (name: string) =>
  z.string().cuid(`Invalid ${name} format`);

const nameBase = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Minimum ${min} characters required`)
    .max(max, `Maximum ${max} characters allowed`)
    .regex(
      /^[a-zA-Z0-9 _-]+$/,
      "Only letters, numbers, spaces, '-' and '_' allowed"
    );

// --- AUTH SCHEMAS ---
export const registerSchema = z.object({
  body: z
    .object({
      name: nameBase(2, 50),
      email: emailBase,
      password: passwordBase,
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: emailBase,
      password: z.string().min(1, "Password is required"),
    })
    .strict(),
});

// --- WORKSPACE SCHEMAS ---
export const createWorkspaceSchema = z.object({
  body: z.object({
    name: nameBase(3, 30),
    description: z.string().trim().max(200).optional(),
  }).strict(),
});

export const workspaceIdParamSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
  }).strict(),
});

// FIXED: workspaceId moved to params to match /api/workspaces/:workspaceId/invite
export const inviteMemberSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
  }),
  body: z.object({
    userId: cuidBase("User ID"),
    role: z.nativeEnum(WorkspaceRole).default("MEMBER"),
  }).strict(),
});

// --- PROJECT SCHEMAS ---
export const createProjectSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
  }),
  body: z.object({
    name: nameBase(3, 50),
    description: z.string().trim().max(500).optional(),
  }).strict(),
});

export const projectIdParamSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
    projectId: cuidBase("Project ID"),
  }).strict(),
});

// --- TASK SCHEMAS ---

export const getTaskQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => Math.max(1, parseInt(val || '1'))),
    limit: z.string().optional().transform((val) => Math.min(100, parseInt(val || '10'))),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().cuid().optional(),
    search: z.string().optional(),
  }).strict(),
});

// FIXED: Added params validation so authorize middleware gets the IDs correctly
export const updateTaskSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
    taskId: cuidBase("Task ID"),
  }),
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().cuid().optional().nullable(),
  }).strict(),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
    taskId: cuidBase("Task ID"),
  }).strict(),
});

export const assignTaskSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
    taskId: cuidBase("Task ID"),
  }),
  body: z.object({
    assigneeId: z.string().cuid().nullable().optional(),
  }).strict(),
});

// --- USER / DASHBOARD SCHEMAS ---

export const myTasksQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => Math.max(1, parseInt(val || '1'))),
    limit: z.string().optional().transform((val) => Math.min(100, parseInt(val || '10'))),
    workspaceId: z.string().cuid().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
  }).strict(),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordBase, 
    confirmNewPassword: z.string()
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  }),
});

// --- ACTIVITY LOG SCHEMAS ---

export const getTaskActivityLogSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
    taskId: cuidBase("Task ID"),
  }),
  query: z.object({
    page: z.string().optional().transform((v) => Math.max(1, parseInt(v || '1'))),
    limit: z.string().optional().transform((v) => Math.min(100, parseInt(v || '15'))),
  }).strict(),
});

export const getWorkspaceActivityLogSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
  }),
  query: z.object({
    action: z.string().optional(),
    userId: z.string().cuid().optional(),
    taskId: z.string().cuid().optional(),
    page: z.string().optional().transform((v) => Math.max(1, parseInt(v || '1'))),
    limit: z.string().optional().transform((v) => Math.min(100, parseInt(v || '20'))),
  }).strict(),
});


// ---------- ATTACHMENT SCHEMAS ----------
export const uploadAttachmentSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
    taskId: cuidBase("Task ID"),
  }),
  // file is validated by multer
});

export const getTaskAttachmentsSchema = z.object({
  params: z.object({
    workspaceId: cuidBase("Workspace ID"),
    taskId: cuidBase("Task ID"),
  }),
});

export const deleteAttachmentSchema = z.object({
  params: z.object({
    attachmentId: cuidBase("Attachment ID"),
  }),
});