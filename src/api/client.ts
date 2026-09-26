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

export const API_ACTIVITY_EVENT = 'ninimum-api-activity';

let activeTrackedRequests = 0;

function emitApiActivity() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(API_ACTIVITY_EVENT, { detail: activeTrackedRequests }));
}

function beginApiActivity() {
  activeTrackedRequests += 1;
  emitApiActivity();
}

function endApiActivity() {
  activeTrackedRequests = Math.max(0, activeTrackedRequests - 1);
  emitApiActivity();
}

interface RequestOptions extends RequestInit {
  token?: string;
  /**
   * Controls the global blocking loader. By default, write requests are tracked
   * and read requests are not. Set false for POST endpoints that only search/read.
   */
  showLoading?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { token, showLoading, ...requestOptions } = options;
  const method = String(requestOptions.method ?? 'GET').toUpperCase();
  const trackLoading = showLoading ?? !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (trackLoading) beginApiActivity();

  try {
    const headers = new Headers(requestOptions.headers);
    headers.set('Accept', 'application/json');

    // Only string request bodies in this app are JSON.
    // FormData/Blob/ArrayBuffer bodies must keep their own content type so the
    // browser/server can process image uploads correctly.
    if (typeof requestOptions.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { ...requestOptions, headers });
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
  } finally {
    if (trackLoading) endApiActivity();
  }
}

