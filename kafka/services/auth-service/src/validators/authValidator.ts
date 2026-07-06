import * as z from "zod";

const registerSchema = z.object({
    body: {
        name: z.string().min(3, "Name must be at least 3 characters long"),
        email: z.string().email("Invalid email"),
        password: z.string().min(6, "Password must be at least 6 characters long")
    }
});

const loginSchema = z.object({
    body: {
        email: z.string().email("Invalid email"),
        password: z.string().min(6, "Password must be at least 6 characters long")
    }
});

export { registerSchema, loginSchema };