import { z } from 'zod';
import {
  emptyToUndefined,
  locationSchema,
  optionalLocationRefSchema,
  paginationSchema,
  resourceRefSchema,
} from '../core';

export const expenseLocationSchema = optionalLocationRefSchema;
export const expenseUserSchema = resourceRefSchema.optional().nullable();
export const expensePaginationSchema = paginationSchema;

export const expenseSchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  amount: z.coerce.number(),
  date: z.coerce.string().transform((value) => value.slice(0, 10)),
  created_at: z.coerce.string().optional(),
  updated_at: z.coerce.string().optional().nullable(),
  transaction_code: z.string().optional().nullable(),
  location: expenseLocationSchema,
  updated_by_user: expenseUserSchema,
});

export const rankedExpenseSchema = expenseSchema.extend({
  rank: z.number().int().positive(),
});

export const expenseCategoryTotalSchema = z.object({
  category: z.string(),
  total: z.coerce.number(),
  count: z.coerce.number(),
  percent: z.coerce.number(),
});

export const expenseListResponseSchema = z.object({
  expenses: z.array(expenseSchema),
  pagination: expensePaginationSchema,
});

export const expenseSummaryQuerySchema = z.object({
  year: z.coerce.number().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  location_id: z.string().optional(),
  all_time: z.enum(['true', 'false']).optional(),
});

export const expenseSummaryResponseSchema = z.object({
  all_time: z.boolean(),
  year: z.number().nullable(),
  month: z.number().nullable(),
  label: z.string(),
  total: z.coerce.number(),
  count: z.coerce.number(),
  by_category: z.array(expenseCategoryTotalSchema),
  ranked_expenses: z.array(rankedExpenseSchema),
});

export const expenseWriteBodySchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.union([z.string(), z.number()]),
  date: z.string().min(1),
  location_id: z.string().min(1),
  transaction_code: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type Expense = z.infer<typeof expenseSchema>;
export type RankedExpense = z.infer<typeof rankedExpenseSchema>;
export type ExpenseCategoryTotal = z.infer<typeof expenseCategoryTotalSchema>;
export type ExpensePagination = z.infer<typeof expensePaginationSchema>;
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;
export type ExpenseSummaryQuery = z.infer<typeof expenseSummaryQuerySchema>;
export type ExpenseSummaryResponse = z.infer<typeof expenseSummaryResponseSchema>;
export type ExpenseWriteBody = z.infer<typeof expenseWriteBodySchema>;
export type ExpenseLocation = z.infer<typeof locationSchema>;
