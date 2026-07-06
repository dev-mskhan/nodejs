export default class ApiError extends Error {
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
