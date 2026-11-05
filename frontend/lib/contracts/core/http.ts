import type { z } from 'zod';
import type { PathParams, QueryRecord } from './types';

export function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function interpolatePath(path: string, params?: PathParams) {
  if (!params) return path;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`:${key}`, encodeURIComponent(value)),
    path
  );
}

export function toSearchParams(query?: QueryRecord) {
  const params = new URLSearchParams();
  if (!query) return '';

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Request failed');
  }
  return schema.parse(payload);
}

export async function assertOk(response: Response, fallback = 'Request failed') {
  if (response.ok) return;
  const payload = await readJson(response);
  throw new Error(typeof payload?.error === 'string' ? payload.error : fallback);
}

export async function contractRequest<T = unknown>(options: {
  method: string;
  path: string;
  schema?: z.ZodType<T>;
  pathParams?: PathParams;
  query?: QueryRecord;
  body?: unknown;
}): Promise<T> {
  const url = `${interpolatePath(options.path, options.pathParams)}${toSearchParams(options.query)}`;
  const hasBody = options.body !== undefined;
  const response = await fetch(url, {
    method: options.method,
    headers: {
      ...authHeaders(),
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  if (options.schema) {
    return parseResponse(response, options.schema);
  }

  await assertOk(response);
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return readJson(response) as Promise<T>;
  }
  return undefined as T;
}
