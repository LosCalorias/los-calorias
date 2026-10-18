import { getToken } from './token';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number>;
};

let unauthorizedListener: (() => void) | null = null;

export function setUnauthorizedListener(listener: (() => void) | null): void {
  unauthorizedListener = listener;
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, query }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${toQueryString(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Немає з'єднання з сервером", 0);
  }

  if (response.status === 401 && token) {
    unauthorizedListener?.();
  }
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function toQueryString(query: RequestOptions['query']): string {
  if (!query) {
    return '';
  }
  const pairs = Object.entries(query).map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
  );
  return `?${pairs.join('&')}`;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
  } catch {
    // Body is not JSON, fall back to a generic message.
  }
  return response.status === 422 ? 'Перевірте введені дані' : 'Щось пішло не так. Спробуйте ще раз';
}
