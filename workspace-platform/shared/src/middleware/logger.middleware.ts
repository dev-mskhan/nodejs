import pinoHttp from "pino-http";

export const httpLogger = pinoHttp({
    transport:
        process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
    serializers: {
        req(req) {
            return {
                method: req.method,
                url: req.url,
            };
        },
        res(res) {
            return { statusCode: res.statusCode };
        },
    },
});
