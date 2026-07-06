import { Router } from "express";
import {
    signup,
    verifyEmail,
    login,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
} from "../controllers/auth.controller.js";
import {
    signupValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    verifyEmailValidator,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/signup", signupValidator, signup);
router.get("/verify-email/:token", verifyEmailValidator, verifyEmail);
router.post("/login", loginValidator, login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPasswordValidator, forgotPassword);
router.post("/reset-password/:token", resetPasswordValidator, resetPassword);

export default router;
