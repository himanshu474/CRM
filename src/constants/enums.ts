/**
 * Application-level enums (mirror Prisma enums)
 */

export enum WorkspaceRoleEnum {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum TaskStatusEnum {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  COMPLETED = "COMPLETED",
}

export enum TaskPriorityEnum {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum LeadStatusEnum {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  NEGOTIATION = "NEGOTIATION",
  WON = "WON",
  LOST = "LOST",
}