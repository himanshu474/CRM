import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { AppError } from "../utils/AppError.js";


// Register User
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  let { email, name, password } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) throw new AppError("Email already exists",400)

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
    select:{
      id:true,
      email:true,
      name:true,
    }
  });
  res.status(201).json({
    success: true,
    token: generateToken(user.id),
    data:user
  });
});


// Login User
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  let { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });


  if (!user) throw new AppError("Invalid Credentials",401)

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) throw new AppError("Invalid Credentials",401)

  const token = generateToken(user.id);

  res.status(200).json({
    success: true,
    token,
  });
});


// Get Users (Protected)
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  
   const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 10);
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);

 res.status(200).json({
    success: true,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit)
    },
    data: users,
  });
});



//update password

export const updatePassword=asyncHandler(async(req:Request,res:Response)=>{
    const{currentPassword,newPassword}=req.body;

    const userId=req.user!.id;


    if(!currentPassword || !newPassword){
        throw new AppError("Both Passwords are required",400)
    }

    const user=await prisma.user.findUnique({
        where:{id:userId}
    })

    if(!user) throw new AppError("User not found",404);


    const isMatch= await bcrypt.compare(currentPassword,user.password);

    if(!isMatch) throw new AppError("Current password is Incorrect",401);

    const hashedPassword= await bcrypt.hash(newPassword,12);

    await prisma.user.update({
        where:{id:userId},
        data:{password:hashedPassword},
    })

    res.json({success:true,message:"Password updated successfully"});

})




