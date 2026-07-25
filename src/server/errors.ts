export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function validationError(fields: Record<string, string>): AppError {
  return new AppError(400, "VALIDATION_ERROR", "The submitted data is invalid.", fields);
}

export const unauthorizedError = () =>
  new AppError(401, "UNAUTHENTICATED", "Authentication is required.");

export const notFoundError = () =>
  new AppError(404, "NOT_FOUND", "The requested resource was not found.");
