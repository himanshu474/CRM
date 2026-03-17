import prisma from "../config/prisma.js";


export const createActivityLog = async ({
    workspaceId,
    userId,
    action,
    taskId,
    field,
    oldValue,
    newValue,
}: any) => {
    await prisma.activityLog.create({
        data: {
            workspaceId,
            userId,
            action,
            taskId,
            field,
            oldValue,
            newValue,
        }
    })
}