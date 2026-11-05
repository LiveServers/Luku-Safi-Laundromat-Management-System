function parseAmount(value) {
  return parseFloat(value) || 0;
}

function summarizeExpenses(rows) {
  const mapped = rows.map((row) => ({
    id: row.id,
    category: row.category || 'Other',
    description: row.description,
    amount: parseAmount(row.amount),
    date: row.date,
    transaction_code: row.transaction_code,
    created_at: row.created_at,
    location: row.location_name
      ? {
          id: row.location_id,
          name: row.location_name,
        }
      : null,
  }));

  const total = mapped.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryMap = new Map();

  for (const expense of mapped) {
    const current = categoryMap.get(expense.category) || {
      category: expense.category,
      total: 0,
      count: 0,
    };
    current.total += expense.amount;
    current.count += 1;
    categoryMap.set(expense.category, current);
  }

  const by_category = Array.from(categoryMap.values())
    .map((entry) => ({
      ...entry,
      percent: total > 0 ? (entry.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

  const ranked_expenses = [...mapped]
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return String(b.date).localeCompare(String(a.date));
    })
    .map((expense, index) => ({
      rank: index + 1,
      ...expense,
    }));

  return {
    total,
    count: mapped.length,
    by_category,
    ranked_expenses,
  };
}

function monthRange(year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!y || !m || m < 1 || m > 12) {
    return null;
  }
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

module.exports = {
  summarizeExpenses,
  monthRange,
};
