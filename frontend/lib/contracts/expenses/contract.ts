import type { ContractRoute } from '../core';
import {
  expenseListResponseSchema,
  expenseSchema,
  expenseSummaryQuerySchema,
  expenseSummaryResponseSchema,
  expenseWriteBodySchema,
} from './schemas';

export const expensesContract = {
  list: {
    method: 'GET',
    path: '/api/expenses',
    responses: {
      200: expenseListResponseSchema,
    },
  },
  summary: {
    method: 'GET',
    path: '/api/expenses/summary',
    query: expenseSummaryQuerySchema,
    responses: {
      200: expenseSummaryResponseSchema,
    },
  },
  create: {
    method: 'POST',
    path: '/api/expenses',
    body: expenseWriteBodySchema,
    responses: {
      201: expenseWriteBodySchema.partial(),
    },
  },
  update: {
    method: 'PUT',
    path: '/api/expenses/:id',
    body: expenseWriteBodySchema,
    responses: {
      200: expenseSchema,
    },
  },
  remove: {
    method: 'DELETE',
    path: '/api/expenses/:id',
    responses: {
      200: expenseWriteBodySchema.partial(),
    },
  },
} as const satisfies {
  list: ContractRoute;
  summary: ContractRoute;
  create: ContractRoute;
  update: ContractRoute;
  remove: ContractRoute;
};
