import { z } from 'zod';

export const emptyToUndefined = (value: unknown) =>
  value === '' || value === undefined ? undefined : value;

export const resourceRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const locationSchema = resourceRefSchema.extend({
  display_name: z.string(),
});

export const optionalLocationRefSchema = resourceRefSchema
  .extend({
    display_name: z.string().optional(),
  })
  .nullable();

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type ResourceRef = z.infer<typeof resourceRefSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
