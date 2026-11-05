import { contractRequest } from '../core';
import { expensesContract } from './contract';
import type { ExpenseSummaryQuery } from './schemas';

export async function fetchExpenseList(params: {
  page: number;
  limit: number;
  search?: string;
  category?: string;
}) {
  return contractRequest({
    method: expensesContract.list.method,
    path: expensesContract.list.path,
    schema: expensesContract.list.responses[200],
    query: {
      page: params.page,
      limit: params.limit,
      search: params.search,
      category: params.category === 'all' ? undefined : params.category,
    },
  });
}

export async function fetchExpenseSummary(query: ExpenseSummaryQuery) {
  return contractRequest({
    method: expensesContract.summary.method,
    path: expensesContract.summary.path,
    schema: expensesContract.summary.responses[200],
    query: {
      year: query.year,
      month: query.month,
      location_id: query.location_id === 'all' ? undefined : query.location_id,
      all_time: query.all_time,
    },
  });
}

export async function createExpense(body: unknown) {
  return contractRequest({
    method: expensesContract.create.method,
    path: expensesContract.create.path,
    body: expensesContract.create.body.parse(body),
  });
}

export async function updateExpense(id: string, body: unknown) {
  return contractRequest({
    method: expensesContract.update.method,
    path: expensesContract.update.path,
    schema: expensesContract.update.responses[200],
    pathParams: { id },
    body: expensesContract.update.body.parse(body),
  });
}

export async function deleteExpense(id: string) {
  return contractRequest({
    method: expensesContract.remove.method,
    path: expensesContract.remove.path,
    pathParams: { id },
  });
}
