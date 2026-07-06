import { body, param } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import ApiError from "../utils/apiError.js";

export const handleValidationErrors = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((err) => {
            if ("path" in err) {
                return `${err.path}: ${err.msg}`;
            }
            return err.msg as string;
        });
        throw new ApiError(422, messages.join(", "));
    }
    next();
};

export const signupValidator = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Must be a valid email"),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain a number"),
    handleValidationErrors,
];

export const loginValidator = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Must be a valid email"),
    body("password")
        .notEmpty().withMessage("Password is required"),
    handleValidationErrors,
];

export const forgotPasswordValidator = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Must be a valid email"),
    handleValidationErrors,
];

export const resetPasswordValidator = [
    param("token")
        .notEmpty().withMessage("Reset token is required"),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain a number"),
    handleValidationErrors,
];

export const verifyEmailValidator = [
    param("token")
        .notEmpty().withMessage("Verification token is required"),
    handleValidationErrors,
];
