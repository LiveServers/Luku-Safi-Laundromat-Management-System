import type { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ContractRoute = {
  method: HttpMethod;
  path: string;
  query?: z.ZodTypeAny;
  body?: z.ZodTypeAny;
  responses: Partial<Record<number, z.ZodTypeAny>>;
};

export type QueryValue = string | number | boolean | null | undefined;
export type QueryRecord = Record<string, QueryValue>;
export type PathParams = Record<string, string>;
