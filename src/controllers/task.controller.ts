import {Response } from "express";
import prisma from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { Prisma, TaskStatus} from "@prisma/client";
import { Req } from "../types/express.js"; 


export const createTask=asyncHandler(async(req:Req,res:Response)=>{
 const { projectId, workspaceId } = req.params; 

const userId=req.user!.id;

const{title,description,priority,assigneeId,status}=req.body;


if (!req.membership||!["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  const project=await prisma.project.findFirst({
    where:{id:projectId,workspaceId:workspaceId,deletedAt:null,
        workspace:{deletedAt:null},
    },
  })

  if(!project){
    throw new AppError("Project Not Found in the workspace",404)
  }

  if(assigneeId){
    const isMember = await prisma.workspaceMember.findUnique({
        where:{
            workspaceId_userId:{
                workspaceId,
                userId:assigneeId
            }
        }
    })
    
      if(!isMember){
        throw new AppError("User Does not belong to same workspace",404)
      }
}

 const result = await prisma.$transaction(async (tx) => {
    // Create the Task
    const task = await tx.task.create({
      data: {
        title,
        description: description ?? null,
        priority: priority || "MEDIUM",
        status: status || "PENDING",
        workspaceId,
        projectId,
        assigneeId: assigneeId ?? null,
      },
    });

    // Create the Activity Log
    await tx.activityLog.create({
      data: {
        workspaceId,
        taskId: task.id,
        userId, // The person creating the task
        action: "CREATE_TASK",
        field: "task",
        newValue: title,
      },
    });

    return task; // This task object becomes the 'result'
  });

res.status(201).json({
    success:true,
    data:result
})

})


export const getTasksByProject=asyncHandler(async(req:Req,res:Response)=>{
    
    const { projectId, workspaceId } = req.params; 

//   Middleware ne req.query ko pehle hi transform kar diya hai)
    // Humne Zod schema mein transform use kiya hai, isliye page/limit ab strings nahi numbers hain.
    const { page, limit, status, priority, assigneeId, search } = req.query as any;

    
    const skip=(page-1) *limit;


    if (!req.membership||!["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Not Permitted", 403);
  }



  const project= await prisma.project.findFirst({
    where:{
        id:projectId,
        workspaceId:workspaceId,
        deletedAt:null
    }
  })

  if(!project){
    throw new AppError("Project not found or was deleted",404)
  }



  const whereClause: Prisma.TaskWhereInput = {
        projectId,
        workspaceId,
        deletedAt: null,
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assigneeId && { assigneeId }),
        ...(search && {
            title: { contains: search, mode: "insensitive" },
        }),
    };


const[tasks,totalCount]=await Promise.all([
    prisma.task.findMany({
        where:whereClause,
        include:{
            assignee:{select:{id:true,name:true,email:true}}
        },
        orderBy:{createdAt:"desc"},
        skip,
        take:limit
    }),
    prisma.task.count({where:whereClause})
])

const totalPages=Math.ceil(totalCount/limit);



res.status(200).json({
    success:true,
    data:tasks,
    pagination:{
        total:totalCount,
        page,
        limit,
        totalPages,
        hasNextPage:page <totalPages,
        hasPrevPage:page>1,
    }
})

})



export const getSingleTask=asyncHandler(async(req:Req,res:Response)=>{
     const { taskId, workspaceId } = req.params;

if (!req.membership||!["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Insufficient permissions", 403);
  }


    const task= await prisma.task.findFirst({
        where:{
            id:taskId,
            workspaceId:workspaceId,
            deletedAt:null,
        },
         include:{
                project:{
                    select:{id:true,name:true}
                },
                assignee:{
                    select:{id:true,name:true}
                },
                attachments:
                {
                    select:{id:true,fileUrl:true,fileType:true}
                }
            }
    })

    if(!task) throw new AppError("Task not found in this workspace",404)


        res.status(200).json({
            success:true,
            data:task
        })

})



export const updateTask = asyncHandler(async (req: Req, res: Response) => {
  const { taskId, workspaceId } = req.params;
  const userId = req.user!.id;
  const { title, description, status, priority, assigneeId } = req.body;

  if (!req.membership || !['ADMIN', 'MEMBER'].includes(req.membership.role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  // Fetch existing task with predecessors (for status check)
  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, workspaceId, deletedAt: null },
    include: {
      predecessors: {
        where: { deletedAt: null },
        select: { status: true }
      }
    }
  });

  if (!existingTask) throw new AppError("Task not found in this workspace", 404);

  // If assigneeId is being updated, verify workspace membership
  if (assigneeId !== undefined) {
    if (assigneeId) {
      const isMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: assigneeId } }
      });
      if (!isMember) {
        throw new AppError("Assignee must be a member of this workspace", 404);
      }
    }
  }

  // 🔥 DEPENDENCY CHECK: If status is being changed to IN_PROGRESS or COMPLETED, ensure no unfinished predecessors
  if (status && (status === "IN_PROGRESS" || status === "COMPLETED")) {
    const hasUnfinishedPredecessor = existingTask.predecessors.some(p => p.status !== "COMPLETED");
    if (hasUnfinishedPredecessor) {
      throw new AppError("Task is blocked by unfinished dependencies", 400);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        title: title ?? undefined,
        description: description ?? undefined,
        priority: priority ?? undefined,
        status: status ?? undefined,
        assigneeId: assigneeId ?? undefined,
      }
    });

    await tx.activityLog.create({
      data: {
        workspaceId,
        taskId,
        userId,
        action: "UPDATE_TASK",
        field: status ? "status" : priority ? "priority" : "details",
        oldValue: existingTask.status,
        newValue: status || existingTask.status
      }
    });

    return updatedTask;
  });

  res.status(200).json({ success: true, data: result });
});



export const deleteTask=asyncHandler(async(req:Req,res:Response)=>{

      const { taskId, workspaceId } = req.params;

    const userId=req.user!.id;

 if(!req.membership || !['ADMIN' ,'MEMBER'].includes(req.membership.role)){
    throw new AppError("Insufficient permissions", 403);
    }


    const task=await prisma.task.findFirst({
        where:{
            id:taskId,
            workspaceId,
            deletedAt:null
        }
    })


    if(!task) throw new AppError("Task not Found",404);

    await prisma.$transaction(async(tx)=>{
        await tx.task.update({
            where:{id:taskId},
            data:{deletedAt:new Date()}
        })

        await tx.activityLog.create({
            data:{
                workspaceId,
                userId,
                taskId,
                action:"DELETE_TASK",
                field:"deletedAt",
                newValue:new Date().toISOString()
            }
        })
    })


    res.status(200).json({
        success:true,
        message:"Task moved to trash successfully"
    })

    
})



export const changeTaskStatus = asyncHandler(async (req: Req, res: Response) => {
  const { taskId, workspaceId } = req.params;
  const { status: newStatus } = req.body;
  const userId = req.user!.id;

  if (!req.membership || !['ADMIN', 'MEMBER'].includes(req.membership.role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  // Fetch task with its predecessors to check blocked status
  const task = await prisma.task.findFirst({
    where: { id: taskId, workspaceId, deletedAt: null },
    include: {
      predecessors: {
        where: { deletedAt: null },
        select: { status: true }
      }
    }
  });

  if (!task) throw new AppError("Task Not Found", 404);

  // Validate status enum
  if (!Object.values(TaskStatus).includes(newStatus as TaskStatus)) {
    throw new AppError("Invalid status value provided", 400);
  }

  // 🔥 DEPENDENCY CHECK: If moving to IN_PROGRESS or COMPLETED, ensure no unfinished predecessors
  if (newStatus === "IN_PROGRESS" || newStatus === "COMPLETED") {
    const hasUnfinishedPredecessor = task.predecessors.some(p => p.status !== "COMPLETED");
    if (hasUnfinishedPredecessor) {
      throw new AppError("Task is blocked by unfinished dependencies", 400);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: { status: newStatus as TaskStatus }
    });

    await tx.activityLog.create({
      data: {
        workspaceId,
        taskId,
        userId,
        action: "UPDATE_STATUS",
        field: "status",
        oldValue: task.status,
        newValue: newStatus
      }
    });

    return updatedTask;
  });

  res.status(200).json({ success: true, data: result });
});


export const assignTask=asyncHandler(async(req:Req,res:Response)=>{
  const { taskId, workspaceId } = req.params;

const{assigneeId}=req.body

const userId=req.user!.id;

if(!req.membership || !['ADMIN' ,'MEMBER'].includes(req.membership.role)){
    throw new AppError("Insufficient permissions", 403);
    }

    const task=await prisma.task.findFirst({
        where:{
            id:taskId,
            workspaceId,
            deletedAt:null
        }
    })

    if(!task) throw new AppError("Task Not Found",404);


    // Optimization: Exit early if the assignee is already the same
    // Normalized to null for comparison
    const normalizedAssigneeId = assigneeId || null;
    if (task.assigneeId === normalizedAssigneeId) {
        return res.status(200).json({
            message: "Task assignment unchanged",
            task
        });
    }

    // 4. Verify Assignee is a member of the workspace
    if (normalizedAssigneeId) {
        const isMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: normalizedAssigneeId
                }
            }
        });

        if (!isMember) {
            throw new AppError("Assignee must be a member of this workspace", 404);
        }
    }

    // 5. Transactional Update and Logging
    const result = await prisma.$transaction(async (tx) => {
        const updatedTask = await tx.task.update({
            where: { id: taskId },
            data: { 
                assigneeId: normalizedAssigneeId 
            }
        });

        await tx.activityLog.create({
            data: {
                workspaceId,
                taskId,
                userId, // Person performing the action
                action: "ASSIGN_TASK",
                field: "assigneeId",
                oldValue: task.assigneeId || "unassigned",
                newValue: normalizedAssigneeId || "unassigned"
            }
        });
        

        return updatedTask;
    });

    return res.status(200).json({
        message: "Task assigned successfully",
        task: result
    });
})


export const getMyTasks = asyncHandler(async (req: Req ,res: Response) => {
    const userId = req.user!.id;
    
    // Pagination aur Filters extract karo
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

      const { workspaceId } = req.params;
    const status = req.query.status as TaskStatus;

    // Parallel execution: Tasks fetch karo aur Total count nikaalo (for frontend meta data)
    const [tasks, totalCount] = await Promise.all([
        prisma.task.findMany({
            where: {
                assigneeId: userId,
                deletedAt: null,
                ...(workspaceId && { workspaceId }),
                ...(status && { status })

            },
            include: {
                project: { select: { name: true } },
                workspace: { select: { name: true } }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ],
            skip: skip,
            take: limit
        }),
        prisma.task.count({
            where: {
                assigneeId: userId,
                deletedAt: null,
                ...(workspaceId && { workspaceId }),
                ...(status && { status })
            }
        })
    ]);

    return res.status(200).json({
        message: "Tasks fetched successfully",
        tasks,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    });
});


