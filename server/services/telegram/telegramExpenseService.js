const telegramDb = require('../../config/telegramDb');

/**
 * Database service used ONLY by the Telegram bot.
 *
 * WHY THIS FILE EXISTS:
 * ----------------------------------
 * The normal web application can continue using `config/database.js`.
 * Telegram instead uses the restricted PostgreSQL login and calls only the
 * stored functions exposed by `telegram_expense_api`.
 *
 * This means a leaked Telegram DB password does NOT give an attacker general
 * access to your application's database.
 */

async function getLocations() {
  const result = await telegramDb.query(
    'SELECT * FROM telegram_expense_api.list_locations()'
  );
  return result.rows;
}

async function createExpense(input) {
  const result = await telegramDb.query(
    `
      SELECT *
      FROM telegram_expense_api.create_expense(
        $1::uuid,
        $2::text,
        $3::text,
        $4::numeric,
        $5::date,
        $6::text
      )
    `,
    [
      input.location_id,
      input.category,
      input.description,
      input.amount,
      input.date,
      input.transaction_code || null,
    ]
  );

  return result.rows[0];
}

async function getExpenseById(id) {
  const result = await telegramDb.query(
    'SELECT * FROM telegram_expense_api.get_expense($1::uuid)',
    [id]
  );
  return result.rows[0] || null;
}

async function getRecentExpenses(limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);

  const result = await telegramDb.query(
    'SELECT * FROM telegram_expense_api.recent_expenses($1::integer)',
    [safeLimit]
  );

  return result.rows;
}

async function updateExpense(id, updates) {
  // Read the row first through the restricted API. RLS/function rules ensure
  // only Telegram-created expenses can be returned here.
  const existing = await getExpenseById(id);

  if (!existing) {
    return null;
  }

  // Merge the requested change with the existing row, then send the complete
  // desired row to one fixed stored procedure. This avoids dynamic SQL.
  const merged = {
    location_id: updates.location_id ?? existing.location_id,
    category: updates.category ?? existing.category,
    description: updates.description ?? existing.description,
    amount: updates.amount ?? Number(existing.amount),
    date: updates.date ?? String(existing.date).slice(0, 10),
    transaction_code:
      Object.prototype.hasOwnProperty.call(updates, 'transaction_code')
        ? updates.transaction_code
        : existing.transaction_code,
  };

  const result = await telegramDb.query(
    `
      SELECT *
      FROM telegram_expense_api.update_expense(
        $1::uuid,
        $2::uuid,
        $3::text,
        $4::text,
        $5::numeric,
        $6::date,
        $7::text
      )
    `,
    [
      id,
      merged.location_id,
      merged.category,
      merged.description,
      merged.amount,
      merged.date,
      merged.transaction_code,
    ]
  );

  return result.rows[0] || null;
}

module.exports = {
  createExpense,
  updateExpense,
  getExpenseById,
  getRecentExpenses,
  getLocations,
};
