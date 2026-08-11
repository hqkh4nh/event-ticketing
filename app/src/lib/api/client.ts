import { tokenStorage } from '@/lib/auth/token-storage';
import { config } from '@/lib/config';

export type ApiFieldError = { field: string; rule: string };

const API_BASE = `${config.apiUrl}/api`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: ApiFieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorBody = {
  code?: string;
  message?: string;
  fields?: ApiFieldError[];
};

/**
 * Thin typed wrapper over fetch: prepends the API base, attaches the bearer
 * token, sends/parses JSON, and normalizes errors into ApiError.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await tokenStorage.get();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  
  if (config.apiUrl.includes('.ngrok-free.app')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) throw await toApiError(res);

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiFetchBytes(
  path: string,
  options: RequestInit = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const token = await tokenStorage.get();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  
  if (config.apiUrl.includes('.ngrok-free.app')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw await toApiError(res);
  return new Uint8Array(await res.arrayBuffer());
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = 'INTERNAL_ERROR';
  let message = res.statusText;
  let fields: ApiFieldError[] | undefined;

  try {
    const body = (await res.json()) as ErrorBody;
    code = body.code ?? code;
    message = body.message ?? message;
    fields = body.fields;
  } catch {
    // Not JSON, which usually means a proxy or a crash below the app. Keep
    // the status text and let the generic code stand.
  }

  return new ApiError(res.status, code, message, fields);
}
