import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { Req } from "../types/express.js"; 


export const getTaskActivityLogs = asyncHandler(async(req:Req,res:Response)=>{
       const { workspaceId, taskId } = req.params;

    const { page, limit } = req.query as any;

        const skip = (page - 1) * limit;
        
    if(!req.membership || !['ADMIN',"MEMBER"].includes(req.membership.role))
    {
        throw new AppError("Insufficient permissions",403)
    }


    const task=await prisma.task.findFirst({
        where:{id:taskId,workspaceId,deletedAt:null},
    })

        if (!task) throw new AppError("Task not found", 404);

        const[logs,total]=await Promise.all([
            prisma.activityLog.findMany({
                where:{workspaceId,taskId},
                include:{user:{select:{id:true,name:true}}},
                orderBy:{createdAt:"desc"},
                skip,
                take:limit
            }),
            prisma.activityLog.count({where:{workspaceId,taskId}})
        ])


        res.status(200).json({
            success:true,
            data:logs,
            pagination:{total,page,limit,totalPages:Math.ceil(total/limit)}
        })
})


export const getWorkspaceActivityLog = asyncHandler(async (req: Req, res: Response) => {
    const { workspaceId } = req.params;
    const { action, userId: fUserId, taskId: fTaskId, page, limit } = req.query as any;
    const skip = (page - 1) * limit;

    if (req.membership?.role !== "ADMIN") {
        throw new AppError("Admin access required", 403);
    }


    const whereClause={
        workspaceId,
        ...(action && {action}),
        ...(fUserId && {userId:fUserId}),
        ...(fTaskId && {taskId:fTaskId}),
    }

    const[logs,total]=await Promise.all([
        prisma.activityLog.findMany({
            where:whereClause,
            include:{
                user:{select:{name:true}},
                task:{select:{title:true}}
            },
            orderBy:{createdAt:"desc"},
            skip,
            take:limit
        }),
        prisma.activityLog.count({where:whereClause})
    ])

res.status(200).json({success:true,data:logs,pagination:{total,page,limit,totalPages:Math.ceil(total/limit)}})
})