// prisma/seed.ts
import {
  WorkspaceRole,
  TaskStatus,
  TaskPriority,
  LeadStatus,
  PaymentProvider,
  PaymentStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("Checking environment...");
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined in .env file");
  process.exit(1);
}

// Create the same pool and adapter as your main app
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

const adapter = new PrismaPg(pool);

// Create PrismaClient with the adapter (same as your app)
const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

async function main() {
  console.log("Seeding database...");

  try {
    // Test connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    const hashedPassword = await bcrypt.hash("Password123!", 12);

    const admin = await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        email: "admin@example.com",
        name: "Admin User",
        password: hashedPassword,
        isVerified: true,
      },
    });

    const member = await prisma.user.upsert({
      where: { email: "member@example.com" },
      update: {},
      create: {
        email: "member@example.com",
        name: "Member User",
        password: hashedPassword,
        isVerified: true,
      },
    });

    console.log("Users seeded.");

    const workspace = await prisma.workspace.upsert({
      where: { id: "seed-workspace-001" },
      update: {},
      create: {
        id: "seed-workspace-001",
        name: "Acme Corp Workspace",
        ownerId: admin.id,
      },
    });

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: admin.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: admin.id,
        role: WorkspaceRole.ADMIN,
      },
    });

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: member.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: member.id,
        role: WorkspaceRole.MEMBER,
      },
    });

    console.log("Workspace and members seeded.");

    const project = await prisma.project.upsert({
      where: { id: "seed-project-001" },
      update: {},
      create: {
        id: "seed-project-001",
        name: "Website Redesign",
        description: "Full redesign of the company website for Q2",
        workspaceId: workspace.id,
        ownerId: admin.id,
      },
    });

    console.log("Project seeded.");

    const tasks = await Promise.all([
      prisma.task.upsert({
        where: { id: "seed-task-001" },
        update: {},
        create: {
          id: "seed-task-001",
          title: "Define project scope",
          description: "Document all deliverables and acceptance criteria",
          status: TaskStatus.COMPLETED,
          priority: TaskPriority.HIGH,
          position: 1000,
          workspaceId: workspace.id,
          projectId: project.id,
          creatorId: admin.id,
          assigneeId: admin.id,
          completedAt: new Date(),
        },
      }),
      prisma.task.upsert({
        where: { id: "seed-task-002" },
        update: {},
        create: {
          id: "seed-task-002",
          title: "Design system setup",
          description: "Configure Tailwind, fonts, and component library",
          status: TaskStatus.IN_REVIEW,
          priority: TaskPriority.HIGH,
          position: 2000,
          workspaceId: workspace.id,
          projectId: project.id,
          creatorId: admin.id,
          assigneeId: member.id,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.task.upsert({
        where: { id: "seed-task-003" },
        update: {},
        create: {
          id: "seed-task-003",
          title: "Build homepage",
          description: "Implement the landing page from Figma designs",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          position: 3000,
          workspaceId: workspace.id,
          projectId: project.id,
          creatorId: admin.id,
          assigneeId: member.id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.task.upsert({
        where: { id: "seed-task-004" },
        update: {},
        create: {
          id: "seed-task-004",
          title: "Write unit tests",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          position: 4000,
          workspaceId: workspace.id,
          projectId: project.id,
          creatorId: admin.id,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.task.upsert({
        where: { id: "seed-task-005" },
        update: {},
        create: {
          id: "seed-task-005",
          title: "SEO audit",
          description: "Run Lighthouse and fix all critical issues",
          status: TaskStatus.BACKLOG,
          priority: TaskPriority.LOW,
          position: 5000,
          workspaceId: workspace.id,
          projectId: project.id,
          creatorId: admin.id,
        },
      }),
    ]);

    console.log("Tasks seeded.");

    await prisma.taskDependency.upsert({
      where: {
        predecessorId_successorId: {
          predecessorId: tasks[0].id,
          successorId: tasks[1].id,
        },
      },
      update: {},
      create: {
        predecessorId: tasks[0].id,
        successorId: tasks[1].id,
      },
    });

    console.log("Task dependency seeded.");

    const company = await prisma.company.upsert({
      where: { id: "seed-company-001" },
      update: {},
      create: {
        id: "seed-company-001",
        name: "TechStart Inc",
        website: "https://techstart.io",
        industry: "Software",
        workspaceId: workspace.id,
        ownerId: admin.id,
      },
    });

    const contact = await prisma.contact.upsert({
      where: { id: "seed-contact-001" },
      update: {},
      create: {
        id: "seed-contact-001",
        name: "Sarah Johnson",
        email: "sarah@techstart.io",
        phone: "+1-555-0199",
        workspaceId: workspace.id,
        ownerId: admin.id,
        companyId: company.id,
      },
    });

    const deal = await prisma.deal.upsert({
      where: { id: "seed-deal-001" },
      update: {},
      create: {
        id: "seed-deal-001",
        title: "Enterprise License — TechStart",
        value: 24000,
        status: LeadStatus.QUALIFIED,
        workspaceId: workspace.id,
        ownerId: admin.id,
        companyId: company.id,
        contactId: contact.id,
      },
    });

    console.log("CRM data seeded.");

    await prisma.payment.upsert({
      where: { id: "seed-payment-001" },
      update: {},
      create: {
        id: "seed-payment-001",
        workspaceId: workspace.id,
        dealId: deal.id,
        amount: 5000,
        currency: "USD",
        status: PaymentStatus.COMPLETED,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: "pi_seed_example_001",
        notes: "Initial deposit for enterprise license",
      },
    });

    console.log("Payment seeded.");

    await prisma.notification.createMany({
      skipDuplicates: true,
      data: [
        {
          userId: member.id,
          workspaceId: workspace.id,
          type: "TASK_ASSIGNED",
          message: "You have been assigned to: Design system setup",
          metadata: { taskId: tasks[1].id },
          isRead: false,
        },
        {
          userId: admin.id,
          workspaceId: workspace.id,
          type: "DEAL_WON",
          message: "Deal Enterprise License — TechStart moved to QUALIFIED",
          metadata: { dealId: deal.id },
          isRead: true,
        },
      ],
    });

    console.log("Notifications seeded.");

    await prisma.activityLog.createMany({
      skipDuplicates: true,
      data: [
        {
          workspaceId: workspace.id,
          taskId: tasks[0].id,
          userId: admin.id,
          action: "TASK_CREATED",
          metadata: { title: tasks[0].title },
        },
        {
          workspaceId: workspace.id,
          taskId: tasks[1].id,
          userId: admin.id,
          action: "TASK_ASSIGNED",
          metadata: { assigneeId: member.id, assigneeName: member.name },
        },
        {
          workspaceId: workspace.id,
          dealId: deal.id,
          userId: admin.id,
          action: "DEAL_CREATED",
          metadata: { title: deal.title, value: 24000 },
        },
        {
          workspaceId: workspace.id,
          dealId: deal.id,
          userId: admin.id,
          action: "PAYMENT_COMPLETED",
          metadata: {
            provider: PaymentProvider.STRIPE,
            amount: 5000,
            currency: "USD",
          },
        },
        {
          workspaceId: workspace.id,
          userId: admin.id,
          action: "MEMBER_INVITED",
          metadata: { inviteeEmail: member.email, role: WorkspaceRole.MEMBER },
        },
      ],
    });

    console.log("Activity logs seeded.");
    console.log("✅ Database seeding complete!");
    
    // Close the pool
    await pool.end();
    
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });