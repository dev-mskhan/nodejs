import User from "../models/User.js";
import asyncHanlder from 'express-async-handler'
import type { Request, Response } from "express";
import ApiError from "@workspace/shared/src/utils/apiError.js";
import ApiResponse from "@workspace/shared/src/utils/apiResponse.js";

const register = asyncHanlder(async(req: Request, res: Response) => {
    const {email, password, name} = (req as any).validated!.body;
    
    const userExists = await User.findOne({email});
    if (userExists) throw new ApiError(400, "User already exists");

    const user = await User.create({email, password, name});
    
    res.json(new ApiResponse(201, user, "User created successfully"))
})

const login = asyncHanlder(async(req: Request, res: Response) => {
    const {email, password} = (req as any).validated!.body;
    
    const userExists = await User.findOne({email});
    if (!userExists) throw new ApiError(400, "User not found");

    const isPasswordValid = await userExists.comparePassword(password);
    if (!isPasswordValid) throw new ApiError(400, "Invalid password");

    
})