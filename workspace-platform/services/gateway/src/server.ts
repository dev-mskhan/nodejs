import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { schemaFromExecutor } from "@graphql-tools/wrap";
import { stitchSchemas } from "@graphql-tools/stitch";
import { getAuthContextUser } from "./middleware/auth.plugin.js";
import { rateLimiter } from "./middleware/rate-limit.js";
import { depthLimitRule } from "./plugins/depth-limit.js";
import { complexityLimitRule } from "./plugins/complexity.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3000";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "shk-rtujwt123access";

const app = express();

// Base middleware
app.use(express.json());
app.use(cookieParser(JWT_ACCESS_SECRET)); // Use same JWT access secret for signing cookies
app.use(
    cors({
        origin: true, // Allow client origin
        credentials: true,
    })
);
app.use(rateLimiter);

// Gateway Health check
app.get("/health", (_req, res) => {
    res.json({ status: "healthy", service: "gateway" });
});

const startGateway = async () => {
    console.log("[Gateway] Setting up remote schemas...");

    // Build executor to talk to Auth Service GraphQL endpoint
    const authExecutor = buildHTTPExecutor({
        endpoint: `${AUTH_SERVICE_URL}/graphql`,
        headers: (executorRequest) => {
            const headers: Record<string, string> = {};
            
            // Forward client cookies so signed cookie validation works downstream
            const cookie = executorRequest?.context?.req?.headers?.cookie;
            if (cookie) {
                headers.cookie = cookie;
            }

            // Forward verified user payload as custom headers
            const user = executorRequest?.context?.user;
            if (user) {
                headers["x-user-id"] = user.userId;
                headers["x-user-email"] = user.email;
                headers["x-user-role"] = user.role;
            }

            return headers;
        },
    });

    let authSubschema;
    // Retry logic to fetch remote schema (in case Auth Service is starting up)
    for (let i = 0; i < 5; i++) {
        try {
            console.log(`[Gateway] Attempting to fetch Auth Service schema (attempt ${i + 1}/5)...`);
            const remoteSchema = await schemaFromExecutor(authExecutor);
            authSubschema = {
                schema: remoteSchema,
                executor: authExecutor,
            };
            console.log("[Gateway] Successfully fetched Auth Service schema");
            break;
        } catch (err) {
            console.warn("[Gateway] Failed to fetch Auth Service schema, retrying in 3 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }

    if (!authSubschema) {
        throw new Error("Could not fetch downstream GraphQL schema for Auth Service");
    }

    // Stitch schemas (scalable to add chat-service, projects-service, etc.)
    const gatewaySchema = stitchSchemas({
        subschemas: [authSubschema],
    });

    // Initialize Apollo Server
    const server = new ApolloServer({
        schema: gatewaySchema,
        validationRules: [
            depthLimitRule(5),         // Max query depth of 5
            complexityLimitRule(100),   // Max query complexity of 100 fields
        ],
    });

    await server.start();

    // Mount GraphQL route
    app.use(
        "/graphql",
        expressMiddleware(server, {
            context: async ({ req, res }) => {
                // Parse JWT to determine user context at the Gateway
                const user = getAuthContextUser(req);
                return { req, res, user };
            },
        })
    );

    app.listen(PORT, () => {
        console.log(`[Gateway] Unified GraphQL Server running on http://localhost:${PORT}/graphql`);
    });
};

startGateway().catch((err) => {
    console.error("[Gateway] Initialization failed:", err);
    process.exit(1);
});
