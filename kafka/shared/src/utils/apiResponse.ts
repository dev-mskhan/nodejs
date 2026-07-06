class ApiResponse<T> {
    success: boolean;

    constructor(
        public statusCode: number,
        public data: T | null,
        public message: string = "Success"
    ) {
        this.success = statusCode < 400;
    }
}

export default ApiResponse;