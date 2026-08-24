function pad(value) {
  return String(value).padStart(2, '0');
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function constructPeriodRange({ period = 'monthly', year, month, quarter, half }) {
  const y = parseInt(year, 10);
  if (!y) {
    throw new Error('Year is required');
  }

  if (period === 'quarterly') {
    const q = parseInt(quarter, 10) || 1;
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return {
      startDate: `${y}-${pad(startMonth)}-01`,
      endDate: `${y}-${pad(endMonth)}-${pad(lastDayOfMonth(y, endMonth))}`,
      label: `Q${q} ${y}`
    };
  }

  if (period === 'semi_annual') {
    const h = parseInt(half, 10) || 1;
    const startMonth = h === 2 ? 7 : 1;
    const endMonth = h === 2 ? 12 : 6;
    return {
      startDate: `${y}-${pad(startMonth)}-01`,
      endDate: `${y}-${pad(endMonth)}-${pad(lastDayOfMonth(y, endMonth))}`,
      label: `H${h} ${y}`
    };
  }

  if (period === 'annual') {
    return {
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
      label: `${y}`
    };
  }

  const m = parseInt(month, 10) || 1;
  return {
    startDate: `${y}-${pad(m)}-01`,
    endDate: `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`,
    label: `${y}-${pad(m)}`
  };
}

module.exports = { constructPeriodRange };
