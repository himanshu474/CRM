export const PERMISSIONS = {
  WORKSPACE: {
    CREATE: "workspace:create",
    UPDATE: "workspace:update",
    DELETE: "workspace:delete",
    INVITE: "workspace:invite",
    MANAGE_MEMBERS: "workspace:manage_members",
  },
  PROJECT: {
    CREATE: "project:create",
    UPDATE: "project:update",
    DELETE: "project:delete",
    VIEW: "project:view",
  },
  TASK: {
    CREATE: "task:create",
    UPDATE: "task:update",
    DELETE: "task:delete",
    ASSIGN: "task:assign",
    MANAGE_DEPENDENCIES: "task:manage_dependencies", // For TaskDependency model
  },
  ATTACHMENT: {
    UPLOAD: "attachment:upload",
    DELETE: "attachment:delete",
  },
  SESSIONS: {
    VIEW: "sessions:view",
    REVOKE: "sessions:revoke",
  },
   CRM: {
    CREATE: ["ADMIN", "MEMBER"],
    UPDATE: ["ADMIN", "MEMBER"],
    DELETE: ["ADMIN"], // ONLY ADMIN CAN DELETE
    VIEW: ["ADMIN", "MEMBER"],
  },
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]];
