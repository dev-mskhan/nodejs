import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import env from "./config/env.js";
import { connectDB } from "./config/mongodb.js";
import { emailProducer } from "./config/kafka.js";
import authRoutes from "./routes/auth.routes.js";
import { typeDefs } from "./graphql/auth.typedefs.js";
import { resolvers } from "./graphql/auth.resolvers.js";
import { errorHandler, httpLogger } from "@workspace/shared";
import { verifyAccessToken } from "./utils/generateToken.js";

const app = express();

// Base middleware
app.use(httpLogger);
app.use(express.json());
app.use(cookieParser(env.jwt.accessSecret)); // Signed cookies using access secret

app.use(
    cors({
        origin: env.cors.clientUrl,
        credentials: true,
    })
);

// REST routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "healthy", service: "auth-service" });
});

// Setup Apollo Server
const server = new ApolloServer({
    typeDefs,
    resolvers,
});

// Start Apollo Server & Express App
const startServer = async () => {
    await connectDB();
    
    // Connect Kafka email producer
    try {
        await emailProducer.connect();
        console.log("[Kafka] Email producer initialized successfully");
    } catch (err) {
        console.error("[Kafka] Failed to connect producer:", err);
    }

    await server.start();

    app.use(
        "/graphql",
        expressMiddleware(server, {
            context: async ({ req, res }) => {
                let user: { userId: string; email: string; role: string } | undefined;

                // 1. Check if user is set by Gateway headers
                const userId = req.headers["x-user-id"];
                const userEmail = req.headers["x-user-email"];
                const userRole = req.headers["x-user-role"];

                if (userId && userEmail) {
                    user = {
                        userId: String(userId),
                        email: String(userEmail),
                        role: String(userRole || "user"),
                    };
                } else {
                    // 2. Fallback: Parse signed cookie directly (if called directly, not via Gateway)
                    const token = req.signedCookies?.access_token;
                    if (token) {
                        try {
                            user = verifyAccessToken(token);
                        } catch {
                            // Ignore token verification errors for resolver context
                        }
                    }
                }

                return { req, res, user };
            },
        })
    );

    // Error handler middleware
    app.use(errorHandler);

    app.listen(env.port, () => {
        console.log(`[Auth Service] Server running on port ${env.port}`);
    });
};

startServer().catch((err) => {
    console.error("Failed to start Auth Service:", err);
    process.exit(1);
});