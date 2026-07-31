export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public data?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
