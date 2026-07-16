export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Invalid credentials") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export function apiResponse<T>(data: T) {
  return { data, error: null };
}

export function apiError(error: AppError) {
  return {
    data: null,
    error: { code: error.code, message: error.message, details: error.details },
  };
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(apiError(error), { status: error.statusCode });
  }
  console.error("Unhandled error:", error);
  return Response.json(
    { data: null, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 },
  );
}
