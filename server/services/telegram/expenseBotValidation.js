const CATEGORIES = [
  'Electricity',
  'Water Bill',
  'Industrial Detergents (Booster, Oxybleach, Powder, Fabric Softener)',
  'Rent',
  'Salary',
  'Rider Payments (Pickup & Delivery)',
  'Detergents (Bar Soap, Normal Powder, Downy)',
  'Bundle (Calls & WhatsApp/SMS)',
  'Marketing (Flyers, Business Cards, Instagram Ads)',
  'Repairs',
  'New Equipment (Machines, Mop Sticks, Lights)',
  'Business Permits (Business, Health, Signage)',
  'Laundry Bags & Suit Covers',
  'Other',
];

const CATEGORY_ALIASES = {
  electricity: 'Electricity',
  power: 'Electricity',
  kplc: 'Electricity',
  water: 'Water Bill',
  'water bill': 'Water Bill',
  'industrial detergent': 'Industrial Detergents (Booster, Oxybleach, Powder, Fabric Softener)',
  'industrial detergents': 'Industrial Detergents (Booster, Oxybleach, Powder, Fabric Softener)',
  rent: 'Rent',
  salary: 'Salary',
  salaries: 'Salary',
  rider: 'Rider Payments (Pickup & Delivery)',
  riders: 'Rider Payments (Pickup & Delivery)',
  'rider payment': 'Rider Payments (Pickup & Delivery)',
  'rider payments': 'Rider Payments (Pickup & Delivery)',
  detergent: 'Detergents (Bar Soap, Normal Powder, Downy)',
  detergents: 'Detergents (Bar Soap, Normal Powder, Downy)',
  bundle: 'Bundle (Calls & WhatsApp/SMS)',
  calls: 'Bundle (Calls & WhatsApp/SMS)',
  marketing: 'Marketing (Flyers, Business Cards, Instagram Ads)',
  ads: 'Marketing (Flyers, Business Cards, Instagram Ads)',
  repair: 'Repairs',
  repairs: 'Repairs',
  equipment: 'New Equipment (Machines, Mop Sticks, Lights)',
  'new equipment': 'New Equipment (Machines, Mop Sticks, Lights)',
  permit: 'Business Permits (Business, Health, Signage)',
  permits: 'Business Permits (Business, Health, Signage)',
  'business permits': 'Business Permits (Business, Health, Signage)',
  'laundry bags': 'Laundry Bags & Suit Covers',
  'suit covers': 'Laundry Bags & Suit Covers',
  other: 'Other',
};

function normalize(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveCategory(input) {
  const normalized = normalize(input);
  if (!normalized) return null;

  if (CATEGORY_ALIASES[normalized]) {
    return CATEGORY_ALIASES[normalized];
  }

  const exact = CATEGORIES.find(
    (category) => normalize(category) === normalized
  );

  if (exact) return exact;

  const matches = CATEGORIES.filter(
    (category) => normalize(category).includes(normalized)
  );

  return matches.length === 1 ? matches[0] : null;
}

/**
 * Expense dates are intentionally STRICT.
 *
 * Accepted:
 *   2026-09-07
 *
 * Rejected:
 *   today
 *   07/09/2026
 *   07-09-2026
 *   September 7
 */
function validateDate(date) {
  const value = String(date || '').trim();

  if (!value) {
    throw new Error('Date is required and must use YYYY-MM-DD format.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(
      'Invalid date format. Use YYYY-MM-DD, e.g. 2026-09-07.'
    );
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Invalid calendar date.');
  }

  return value;
}

function validateAmount(amount) {
  const parsed = Number(amount);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Amount must be a number greater than 0.');
  }

  return Number(parsed.toFixed(2));
}

function validateDescription(description) {
  const value = String(description || '').trim();

  if (!value) {
    throw new Error('Description is required.');
  }

  if (value.length > 1000) {
    throw new Error('Description is too long.');
  }

  return value;
}

function validateTransactionCode(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const cleaned = String(value).trim();

  if (cleaned.length > 100) {
    throw new Error('Transaction code is too long.');
  }

  return cleaned || null;
}

module.exports = {
  CATEGORIES,
  resolveCategory,
  validateDate,
  validateAmount,
  validateDescription,
  validateTransactionCode,
  normalize,
};
