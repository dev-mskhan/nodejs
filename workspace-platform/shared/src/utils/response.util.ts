export class ApiResponse<T = unknown> {
    public success: boolean;

    constructor(
        public statusCode: number,
        public data: T,
        public message: string = "Success"
    ) {
        this.success = statusCode < 400;
    }
}

export class ApiError extends Error {
    public success = false;

    constructor(
        public statusCode: number,
        message: string = "Something went wrong",
        public errors: unknown[] = [],
        stack?: string
    ) {
        super(message);
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
