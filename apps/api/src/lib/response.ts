import type { ApiResponse } from "@vikela/shared";

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { data, error: null, meta };
}

export function err<T = null>(message: string, meta?: Record<string, unknown>): ApiResponse<T> {
  return { data: null, error: message, meta };
}
