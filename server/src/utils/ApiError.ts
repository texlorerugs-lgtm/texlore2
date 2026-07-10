/**
 * ApiError — throw these anywhere in services/controllers; the
 * global error middleware translates them into the standard envelope.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly errors: unknown[] | null;
  public readonly isOperational: boolean;

  constructor(status: number, message: string, errors: unknown[] | null = null) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', errors: unknown[] | null = null): ApiError {
    return new ApiError(400, msg, errors);
  }
  static unauthorized(msg = 'Unauthorized'): ApiError {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Forbidden'): ApiError {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Not found'): ApiError {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Conflict'): ApiError {
    return new ApiError(409, msg);
  }
  static tooMany(msg = 'Too many requests'): ApiError {
    return new ApiError(429, msg);
  }
  static internal(msg = 'Internal server error'): ApiError {
    return new ApiError(500, msg);
  }
}
