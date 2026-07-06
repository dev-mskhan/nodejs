export default class ApiResponse<T = unknown> {
    public success: boolean;

    constructor(
        public statusCode: number,
        public data: T,
        public message: string = "Success"
    ) {
        this.success = statusCode < 400;
    }
}
