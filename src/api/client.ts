import type { ApiResponse } from './types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083').replace(/\/$/, '');

export class ApiError extends Error {
  resultCode?: string;
  status?: number;

  constructor(message: string, resultCode?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.resultCode = resultCode;
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('NETWORK_ERROR');
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('INVALID_RESPONSE', undefined, response.status);
  }

  if (!response.ok || payload.resultCode !== '100') {
    throw new ApiError(payload.resultMsg || 'REQUEST_FAILED', payload.resultCode, response.status);
  }

  return payload;
}
