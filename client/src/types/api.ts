/**
 * Mirrors the server's response envelope so components have full type safety.
 */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  errors: null;
}

export interface ApiFailure {
  success: false;
  message: string;
  data: null;
  errors: unknown[] | null;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
