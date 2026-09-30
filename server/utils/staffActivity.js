const { isManagerRole } = require('../middleware/requireManager');
const { nairobiToday, nairobiDateOffset } = require('../db/ensureStaffActivitySchema');

const ACTIVITY_SELECT = `
  SELECT
    a.id,
    a.activity_text,
    a.activity_date,
    a.created_at,
    a.updated_at,
    a.related_order_id,
    a.related_customer_id,
    a.related_reference,
    a.created_by,
    a.updated_by,
    e.id AS employee_id,
    e.name AS employee_name,
    e.job_title AS employee_job_title,
    e.role AS employee_role,
    e.profile_photo_url AS employee_photo,
    e.location_id AS employee_default_location_id,
    l.id AS location_id,
    l.name AS location_name,
    l.display_name AS location_display_name,
    sl.id AS secondary_location_id,
    sl.name AS secondary_location_name,
    sl.display_name AS secondary_location_display_name,
    c.id AS category_id,
    c.name AS category_name,
    creator.name AS created_by_name,
    editor.name AS updated_by_name,
    o.id AS order_id,
    cust.name AS related_customer_name,
    EXISTS (
      SELECT 1 FROM employee_activity_revisions r WHERE r.activity_id = a.id
    ) AS was_edited
  FROM employee_activities a
  JOIN users e ON e.id = a.employee_id
  JOIN locations l ON l.id = a.location_id
  LEFT JOIN locations sl ON sl.id = a.secondary_location_id
  LEFT JOIN activity_categories c ON c.id = a.category_id
  LEFT JOIN users creator ON creator.id = a.created_by
  LEFT JOIN users editor ON editor.id = a.updated_by
  LEFT JOIN orders o ON o.id = a.related_order_id
  LEFT JOIN customers cust ON cust.id = COALESCE(a.related_customer_id, o.customer_id)
`;

function mapActivity(row) {
  return {
    id: row.id,
    activity_text: row.activity_text,
    activity_date: row.activity_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    related_order_id: row.related_order_id,
    related_customer_id: row.related_customer_id,
    related_reference: row.related_reference || (row.related_order_id ? String(row.related_order_id).slice(0, 8).toUpperCase() : null),
    related_order_ref: row.related_reference || (row.related_order_id ? String(row.related_order_id).slice(0, 8).toUpperCase() : null),
    related_customer_name: row.related_customer_name || null,
    was_edited: Boolean(row.was_edited),
    employee: {
      id: row.employee_id,
      name: row.employee_name,
      job_title: row.employee_job_title,
      role: row.employee_role,
      profile_photo_url: row.employee_photo,
      location_id: row.employee_default_location_id,
    },
    branch: {
      id: row.location_id,
      name: row.location_name,
      display_name: row.location_display_name,
    },
    secondary_branch: row.secondary_location_id
      ? {
          id: row.secondary_location_id,
          name: row.secondary_location_name,
          display_name: row.secondary_location_display_name,
        }
      : null,
    category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
    created_by: { id: row.created_by, name: row.created_by_name },
    updated_by: row.updated_by ? { id: row.updated_by, name: row.updated_by_name } : null,
  };
}

function mapEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    job_title: row.job_title,
    phone: row.phone,
    profile_photo_url: row.profile_photo_url,
    is_active: row.is_active,
    created_at: row.created_at,
    location: row.location_id
      ? {
          id: row.location_id,
          name: row.location_name,
          display_name: row.location_display_name,
        }
      : null,
  };
}

function resolveDateRange(query) {
  const preset = query.preset || '';
  if (preset === 'today') {
    const today = nairobiToday();
    return { from: today, to: today };
  }
  if (preset === 'yesterday') {
    const yesterday = nairobiDateOffset(-1);
    return { from: yesterday, to: yesterday };
  }
  if (preset === 'last7' || preset === 'this_week') {
    return { from: nairobiDateOffset(-6), to: nairobiToday() };
  }
  if (preset === 'this_month') {
    const today = nairobiToday();
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }
  if (preset === 'all' || preset === 'all_time') {
    return { from: null, to: null };
  }
  return {
    from: query.from || query.date || null,
    to: query.to || query.date || null,
  };
}

function buildActivityFilters(query, user) {
  const clauses = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('?', `$${params.length}`));
  };

  if (!isManagerRole(user.role)) {
    add('a.employee_id = ?', user.id);
  } else if (query.employee_id) {
    add('a.employee_id = ?', query.employee_id);
  }

  if (query.location_id) {
    add('(a.location_id = ? OR a.secondary_location_id = ?)', query.location_id);
    params.push(query.location_id);
    clauses[clauses.length - 1] = `(a.location_id = $${params.length - 1} OR a.secondary_location_id = $${params.length})`;
  }

  if (query.category_id) {
    add('a.category_id = ?', query.category_id);
  }

  if (query.role) {
    add('(e.job_title ILIKE ? OR e.role = ?)', `%${query.role}%`);
    params.push(query.role);
    clauses[clauses.length - 1] = `(e.job_title ILIKE $${params.length - 1} OR e.role = $${params.length})`;
  }

  if (query.search) {
    add('a.activity_text ILIKE ?', `%${query.search.trim()}%`);
  }

  const { from, to } = resolveDateRange(query);
  if (from) add('a.activity_date >= ?', from);
  if (to) add('a.activity_date <= ?', to);

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
}

function canEditActivity(user, activity) {
  if (isManagerRole(user.role)) return true;
  if (activity.employee_id !== user.id) return false;
  const created = new Date(activity.created_at).getTime();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return created >= cutoff;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    job_title: user.job_title,
    phone: user.phone,
    profile_photo_url: user.profile_photo_url,
    is_active: user.is_active !== false,
    location_id: user.location_id,
  };
}

module.exports = {
  ACTIVITY_SELECT,
  mapActivity,
  mapEmployee,
  resolveDateRange,
  buildActivityFilters,
  canEditActivity,
  publicUser,
};
