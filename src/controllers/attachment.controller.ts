import { Response} from 'express';
import prisma from "../config/prisma.js";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { createActivityLog } from '../utils/createActivityLog.js';
import { Req } from '../types/express.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { WorkspaceRole } from '@prisma/client';


export const uploadAttachment = asyncHandler(async(req:Req,res:Response)=>{
    const{workspaceId,taskId}=req.params;
    const userId=req.user!.id;

    if (!req.membership||!["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Forbidden:Insufficient permissions", 403);
  }

 
  // 2. Verify task exists and belongs to workspace
  const task = await prisma.task.findUnique({
    where: { id: taskId, deletedAt: null },
    select: { workspaceId: true, projectId: true },
  });

  if (!task || task.workspaceId !== workspaceId) {
    throw new AppError('Task not found or access denied', 404);
  }

  // 3. Validate file presence (Multer already handled size/type)
  if (!req.file) {
    throw new AppError('File is required', 400);
  }
  const file = req.file;

  // 4. Generate safe storage filename (UUID + original extension)
  const fileExtension = path.extname(file.originalname);
  const safeFileName = `${uuidv4()}${fileExtension}`;
  const storagePath = `${workspaceId}/${task.projectId}/${taskId}/${safeFileName}`;

  // 5. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('Attachments') 
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw new AppError(`Storage upload failed: ${uploadError.message}`, 500);
  }

  // 6. Generate signed URL (valid for 1 hour) – bucket must be private
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('Attachments')
    .createSignedUrl(storagePath, 3600); // 1 hour

  if (signedUrlError || !signedUrlData?.signedUrl) {
    // Cleanup uploaded file
    await supabase.storage.from('Attachments').remove([storagePath]);
    throw new AppError('Failed to generate file access URL', 500);
  }
  const fileUrl = signedUrlData.signedUrl;

  // 7. Save metadata to database
  const attachment = await prisma.attachment.create({
  data: {
    taskId,
    workspaceId,
    fileName: file.originalname,
    fileUrl,
    storagePath,
    uploadedBy: userId, // Ensure this matches 'uploadedBy' in schema, not 'uploader'
    fileType: file.mimetype,
    fileSize: file.size,
  },
});


  // 8. Log activity
  await createActivityLog({
    workspaceId,
    userId,
    taskId,
    action: 'ATTACHMENT_UPLOADED',
    field: 'attachment',
    newValue: file.originalname,
  });

  res.status(201).json({
    success: true,
    data: attachment,
  });
});



//get task attachments

export const getTaskAttachments=asyncHandler(async(req:Req,res:Response)=>{

    const {workspaceId,taskId}=req.params;
    if (!req.membership||!["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Forbidden:Insufficient permissions", 403);
  }

 
  // 2. Verify task exists and belongs to workspace
  const task = await prisma.task.findUnique({
    where: { id: taskId, deletedAt: null },
    select: { workspaceId: true, projectId: true },
  });

  if (!task || task.workspaceId !== workspaceId) {
    throw new AppError('Task not found or access denied', 404);
  }

  const attachments=await prisma.attachment.findMany({
    where:{taskId,deletedAt:null},
    orderBy:{createdAt:"desc"},
  })

  res.json({
    success:true,
    count:attachments.length,
    data:attachments,
  })

})



//delete Attachments(soft delete)
export const deleteAttachment = asyncHandler(async (req: Req, res: Response) => {
const{attachmentId}=req.params;
const userId=req.user!.id;

const attachment=await prisma.attachment.findUnique({
    where:{id:attachmentId,deletedAt:null},
    select:{
        id:true,
        workspaceId:true,
        taskId:true,
        fileName:true,
        storagePath:true,
        uploadedBy:true,
    }
})

if(!attachment){
    throw new AppError("Attachment not found",404)
}

const membership=await prisma.workspaceMember.findUnique({
    where:{
       workspaceId_userId:{
        workspaceId:attachment.workspaceId,
        userId
       },
    },
})


if(!membership){
    throw new AppError('Access Denied:You are not a member of this workspace',403)
}


const isAdmin=membership.role === WorkspaceRole.ADMIN;
const isUploader=attachment.uploadedBy === userId;

if (!isAdmin && !isUploader) {
    throw new AppError('Forbidden: Only workspace admins or the uploader can delete this attachment', 403);
  }


// 3. Delete file from Supabase Storage
  const { error: deleteError } = await supabase.storage
    .from('Attachments')
    .remove([attachment.storagePath]);

  if (deleteError) {
    console.error('Supabase deletion error:', deleteError);
    // Continue with soft delete
  }

  // 4. Soft delete in database
  await prisma.attachment.update({
    where: { id: attachmentId },
    data: { deletedAt: new Date() },
  });

await createActivityLog({
    workspaceId: attachment.workspaceId,
    userId,
    taskId: attachment.taskId,
    action: 'ATTACHMENT_DELETED',
    field: 'attachment',
    oldValue: attachment.fileName,
  });

  res.json({
    success: true,
    message: 'Attachment deleted successfully',
  });



})

