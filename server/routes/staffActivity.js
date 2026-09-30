const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireManager, isManagerRole } = require('../middleware/requireManager');
const { nairobiToday } = require('../db/ensureStaffActivitySchema');
const {
  ACTIVITY_SELECT,
  mapActivity,
  mapEmployee,
  buildActivityFilters,
  canEditActivity,
  resolveDateRange,
} = require('../utils/staffActivity');

const router = express.Router();

function startOfWeekDate() {
  const today = nairobiToday();
  const [year, month, day] = today.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + mondayOffset);
  return utc.toISOString().slice(0, 10);
}

async function getEmployeeOr404(id) {
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.role, u.job_title, u.phone, u.profile_photo_url,
            u.is_active, u.created_at, u.location_id,
            l.name AS location_name, l.display_name AS location_display_name
     FROM users u
     LEFT JOIN locations l ON l.id = u.location_id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const employee = await getEmployeeOr404(req.user.id);
    res.json(mapEmployee(employee));
  } catch (error) {
    console.error('Staff me error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/employees', authenticateToken, async (req, res) => {
  try {
    if (!isManagerRole(req.user.role)) {
      const employee = await getEmployeeOr404(req.user.id);
      return res.json([mapEmployee(employee)]);
    }
    const includeInactive = req.query.include_inactive === 'true';
    const result = await db.query(
      `SELECT u.id, u.email, u.name, u.role, u.job_title, u.phone, u.profile_photo_url,
              u.is_active, u.created_at, u.location_id,
              l.name AS location_name, l.display_name AS location_display_name
       FROM users u
       LEFT JOIN locations l ON l.id = u.location_id
       ${includeInactive ? '' : 'WHERE COALESCE(u.is_active, TRUE) = TRUE'}
       ORDER BY u.name`
    );
    res.json(result.rows.map(mapEmployee));
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/employees', authenticateToken, requireManager, async (req, res) => {
  try {
    const { email, password, name, role = 'attendant', location_id, job_title, phone, profile_photo_url } = req.body;
    if (!email || !password || !name || !location_id) {
      return res.status(400).json({ error: 'Name, email, password and branch are required' });
    }
    if (!['owner', 'manager', 'attendant'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (email, password, name, role, location_id, job_title, phone, profile_photo_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING id`,
      [
        email.trim().toLowerCase(),
        hashed,
        name.trim(),
        role,
        location_id,
        job_title ? job_title.trim() : null,
        phone ? phone.trim() : null,
        profile_photo_url ? profile_photo_url.trim() : null,
      ]
    );
    const employee = await getEmployeeOr404(result.rows[0].id);
    res.status(201).json({ message: 'Employee created successfully', employee: mapEmployee(employee) });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/employees/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const current = await getEmployeeOr404(req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const { name, role, location_id, job_title, phone, profile_photo_url, is_active, password } = req.body;
    if (role && !['owner', 'manager', 'attendant'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    let passwordSql = '';
    const params = [
      name ? name.trim() : current.name,
      role || current.role,
      location_id || current.location_id,
      job_title !== undefined ? (job_title ? job_title.trim() : null) : current.job_title,
      phone !== undefined ? (phone ? phone.trim() : null) : current.phone,
      profile_photo_url !== undefined ? (profile_photo_url ? profile_photo_url.trim() : null) : current.profile_photo_url,
      is_active === undefined ? current.is_active : Boolean(is_active),
    ];
    if (password) {
      passwordSql = `, password = $${params.length + 1}`;
      params.push(await bcrypt.hash(password, 10));
    }
    params.push(req.params.id);
    await db.query(
      `UPDATE users
       SET name = $1, role = $2, location_id = $3, job_title = $4, phone = $5,
           profile_photo_url = $6, is_active = $7, updated_at = NOW()
           ${passwordSql}
       WHERE id = $${params.length}`,
      params
    );
    const employee = await getEmployeeOr404(req.params.id);
    res.json({ message: 'Employee updated successfully', employee: mapEmployee(employee) });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/employees/:id/deactivate', authenticateToken, requireManager, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }
    const current = await getEmployeeOr404(req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    await db.query('UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    const employee = await getEmployeeOr404(req.params.id);
    res.json({ message: 'Employee deactivated', employee: mapEmployee(employee) });
  } catch (error) {
    console.error('Deactivate employee error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/employees/:id', authenticateToken, async (req, res) => {
  try {
    if (!isManagerRole(req.user.role) && req.params.id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const employee = await getEmployeeOr404(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const today = nairobiToday();
    const weekStart = startOfWeekDate();
    const stats = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE activity_date = $2)::int AS today_count,
         COUNT(*) FILTER (WHERE activity_date >= $3)::int AS week_count,
         COUNT(*)::int AS total_count,
         MAX(created_at) AS last_activity_at
       FROM employee_activities
       WHERE employee_id = $1`,
      [req.params.id, today, weekStart]
    );
    const lastRow = await db.query(
      `${ACTIVITY_SELECT} WHERE a.employee_id = $1 ORDER BY a.created_at DESC LIMIT 1`,
      [req.params.id]
    );
    res.json({
      employee: mapEmployee(employee),
      stats: {
        today_count: stats.rows[0].today_count,
        week_count: stats.rows[0].week_count,
        total_count: stats.rows[0].total_count,
        last_activity_at: stats.rows[0].last_activity_at,
        last_activity: lastRow.rows[0] ? mapActivity(lastRow.rows[0]) : null,
      },
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === 'true' && isManagerRole(req.user.role);
    const result = await db.query(
      `SELECT * FROM activity_categories
       ${includeInactive ? '' : 'WHERE is_active = TRUE'}
       ORDER BY sort_order, name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', authenticateToken, requireManager, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const result = await db.query(
      `INSERT INTO activity_categories (name, sort_order, is_active)
       VALUES ($1, COALESCE((SELECT MAX(sort_order) + 1 FROM activity_categories), 1), TRUE)
       RETURNING *`,
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A category with that name already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/categories/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM activity_categories WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const current = existing.rows[0];
    const name = req.body.name !== undefined ? String(req.body.name).trim() : current.name;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const is_active = req.body.is_active === undefined ? current.is_active : Boolean(req.body.is_active);
    const sort_order = req.body.sort_order === undefined ? current.sort_order : req.body.sort_order;
    const result = await db.query(
      `UPDATE activity_categories
       SET name = $1, is_active = $2, sort_order = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, is_active, sort_order, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/note-types', authenticateToken, requireManager, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM management_note_types WHERE is_active = TRUE ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Note types error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;
    const { where, params } = buildActivityFilters(req.query, req.user);
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM employee_activities a
       JOIN users e ON e.id = a.employee_id
       ${where}`,
      params
    );
    const result = await db.query(
      `${ACTIVITY_SELECT} ${where} ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({
      activities: result.rows.map(mapActivity),
      page,
      limit,
      total: countResult.rows[0].total,
      totalPages: Math.ceil(countResult.rows[0].total / limit) || 1,
    });
  } catch (error) {
    console.error('List activities error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/activities', authenticateToken, async (req, res) => {
  try {
    if (req.user.is_active === false) {
      return res.status(403).json({ error: 'Your account is inactive' });
    }
    const text = (req.body.activity_text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Activity text cannot be empty' });
    }
    let employeeId = req.user.id;
    if (req.body.employee_id && req.body.employee_id !== req.user.id) {
      if (!isManagerRole(req.user.role)) {
        return res.status(403).json({ error: 'You can only add activity for yourself' });
      }
      employeeId = req.body.employee_id;
    }
    const employee = await getEmployeeOr404(employeeId);
    if (!employee || employee.is_active === false) {
      return res.status(400).json({ error: 'Employee is invalid or inactive' });
    }
    const locationId = req.body.location_id || employee.location_id;
    if (!locationId) {
      return res.status(400).json({ error: 'A valid branch is required' });
    }
    const location = await db.query('SELECT id FROM locations WHERE id = $1 AND is_active = TRUE', [locationId]);
    if (!location.rows.length) {
      return res.status(400).json({ error: 'Branch is invalid' });
    }
    let secondaryLocationId = req.body.secondary_location_id || null;
    if (secondaryLocationId) {
      if (secondaryLocationId === locationId) {
        secondaryLocationId = null;
      } else {
        const secondary = await db.query('SELECT id FROM locations WHERE id = $1 AND is_active = TRUE', [secondaryLocationId]);
        if (!secondary.rows.length) {
          return res.status(400).json({ error: 'Secondary branch is invalid' });
        }
      }
    }
    let categoryId = req.body.category_id || null;
    if (categoryId) {
      const category = await db.query('SELECT id FROM activity_categories WHERE id = $1 AND is_active = TRUE', [categoryId]);
      if (!category.rows.length) {
        return res.status(400).json({ error: 'Category is invalid' });
      }
    }
    let relatedOrderId = req.body.related_order_id || null;
    let relatedCustomerId = req.body.related_customer_id || null;
    const relatedReference = (req.body.related_reference || '').trim() || null;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (relatedOrderId && !uuidPattern.test(relatedOrderId)) {
      return res.status(400).json({ error: 'Related order must be a valid order ID' });
    }
    if (relatedCustomerId && !uuidPattern.test(relatedCustomerId)) {
      return res.status(400).json({ error: 'Related customer must be a valid customer ID' });
    }
    if (relatedOrderId) {
      const order = await db.query('SELECT id, customer_id FROM orders WHERE id = $1', [relatedOrderId]);
      if (!order.rows.length) {
        return res.status(400).json({ error: 'Related order is invalid' });
      }
      if (!relatedCustomerId) {
        relatedCustomerId = order.rows[0].customer_id;
      }
    }

    const recentDup = await db.query(
      `SELECT id FROM employee_activities
       WHERE employee_id = $1 AND activity_text = $2 AND created_at > NOW() - INTERVAL '15 seconds'
       LIMIT 1`,
      [employeeId, text]
    );
    if (recentDup.rows.length) {
      const existing = await db.query(`${ACTIVITY_SELECT} WHERE a.id = $1`, [recentDup.rows[0].id]);
      return res.status(201).json({
        message: 'Activity added successfully.',
        activity: mapActivity(existing.rows[0]),
      });
    }

    const inserted = await db.query(
      `INSERT INTO employee_activities (
         employee_id, location_id, secondary_location_id, category_id,
         activity_text, related_order_id, related_customer_id, related_reference, activity_date, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (NOW() AT TIME ZONE 'Africa/Nairobi')::date, $9)
       RETURNING id`,
      [employeeId, locationId, secondaryLocationId, categoryId, text, relatedOrderId, relatedCustomerId, relatedReference, req.user.id]
    );
    const created = await db.query(`${ACTIVITY_SELECT} WHERE a.id = $1`, [inserted.rows[0].id]);
    res.status(201).json({
      message: 'Activity added successfully.',
      activity: mapActivity(created.rows[0]),
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Unable to save activity. Please try again.' });
  }
});

router.get('/activities/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`${ACTIVITY_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    const row = result.rows[0];
    if (!isManagerRole(req.user.role) && row.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const revisions = await db.query(
      `SELECT r.*, u.name AS edited_by_name
       FROM employee_activity_revisions r
       JOIN users u ON u.id = r.edited_by
       WHERE r.activity_id = $1
       ORDER BY r.edited_at DESC`,
      [req.params.id]
    );
    res.json({
      activity: mapActivity(row),
      revisions: revisions.rows,
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/activities/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM employee_activities WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    const activity = existing.rows[0];
    if (!canEditActivity(req.user, activity)) {
      return res.status(403).json({ error: 'You can only edit your own recent activity' });
    }
    const text = req.body.activity_text !== undefined ? String(req.body.activity_text).trim() : activity.activity_text;
    if (!text) {
      return res.status(400).json({ error: 'Activity text cannot be empty' });
    }
    const locationId = req.body.location_id || activity.location_id;
    const location = await db.query('SELECT id FROM locations WHERE id = $1', [locationId]);
    if (!location.rows.length) {
      return res.status(400).json({ error: 'Branch is invalid' });
    }
    let secondaryLocationId = req.body.secondary_location_id === undefined
      ? activity.secondary_location_id
      : req.body.secondary_location_id || null;
    const categoryId = req.body.category_id === undefined ? activity.category_id : req.body.category_id || null;
    await db.query(
      `INSERT INTO employee_activity_revisions (
         activity_id, previous_text, previous_category_id, previous_location_id,
         previous_secondary_location_id, edited_by
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        activity.id,
        activity.activity_text,
        activity.category_id,
        activity.location_id,
        activity.secondary_location_id,
        req.user.id,
      ]
    );
    await db.query(
      `UPDATE employee_activities
       SET activity_text = $1, location_id = $2, secondary_location_id = $3,
           category_id = $4, updated_by = $5
       WHERE id = $6`,
      [text, locationId, secondaryLocationId, categoryId, req.user.id, activity.id]
    );
    const updated = await db.query(`${ACTIVITY_SELECT} WHERE a.id = $1`, [activity.id]);
    res.json({ message: 'Activity updated successfully.', activity: mapActivity(updated.rows[0]) });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Unable to save activity. Please try again.' });
  }
});

router.get('/dashboard', authenticateToken, requireManager, async (req, res) => {
  try {
    const today = nairobiToday();
    const locationFilter = req.query.location_id
      ? 'AND (a.location_id = $2 OR a.secondary_location_id = $2)'
      : '';
    const params = req.query.location_id ? [today, req.query.location_id] : [today];
    const summary = await db.query(
      `SELECT
         COUNT(*)::int AS activities_today,
         COUNT(DISTINCT a.employee_id)::int AS active_employees_today
       FROM employee_activities a
       WHERE a.activity_date = $1 ${locationFilter}`,
      params
    );
    const employees = await db.query(
      `SELECT u.id, u.name, u.job_title, u.profile_photo_url, u.role, u.location_id,
              l.display_name AS location_display_name,
              COUNT(a.id)::int AS today_count,
              MAX(a.created_at) AS last_activity_at
       FROM users u
       LEFT JOIN locations l ON l.id = u.location_id
       LEFT JOIN employee_activities a ON a.employee_id = u.id AND a.activity_date = $1
       WHERE COALESCE(u.is_active, TRUE) = TRUE
       GROUP BY u.id, l.display_name
       ORDER BY today_count DESC, u.name`,
      [today]
    );
    const recent = await db.query(
      `${ACTIVITY_SELECT} WHERE a.activity_date = $1 ${req.query.location_id ? 'AND (a.location_id = $2 OR a.secondary_location_id = $2)' : ''}
       ORDER BY a.created_at DESC LIMIT 25`,
      params
    );
    const withActivity = employees.rows.filter((row) => row.today_count > 0);
    const withoutActivity = employees.rows.filter((row) => row.today_count === 0);
    res.json({
      date: today,
      activities_today: summary.rows[0].activities_today,
      active_employees_today: summary.rows[0].active_employees_today,
      employees_without_activity: withoutActivity.length,
      who_worked: withActivity.map((row) => ({
        id: row.id,
        name: row.name,
        job_title: row.job_title,
        profile_photo_url: row.profile_photo_url,
        today_count: row.today_count,
        last_activity_at: row.last_activity_at,
        location: { display_name: row.location_display_name },
      })),
      who_has_not: withoutActivity.map((row) => ({
        id: row.id,
        name: row.name,
        job_title: row.job_title,
        profile_photo_url: row.profile_photo_url,
        location: { display_name: row.location_display_name },
      })),
      recent: recent.rows.map(mapActivity),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/overview', authenticateToken, requireManager, async (req, res) => {
  try {
    const date = req.query.date || nairobiToday();
    const result = await db.query(
      `SELECT u.id, u.name, u.job_title, u.profile_photo_url, u.role,
              l.display_name AS location_display_name,
              COUNT(a.id)::int AS activity_count
       FROM users u
       LEFT JOIN locations l ON l.id = u.location_id
       LEFT JOIN employee_activities a ON a.employee_id = u.id AND a.activity_date = $1
       WHERE COALESCE(u.is_active, TRUE) = TRUE
       GROUP BY u.id, l.display_name
       ORDER BY u.name`,
      [date]
    );
    const activities = await db.query(
      `${ACTIVITY_SELECT} WHERE a.activity_date = $1 ORDER BY e.name, a.created_at ASC`,
      [date]
    );
    const byEmployee = {};
    for (const row of activities.rows) {
      const mapped = mapActivity(row);
      if (!byEmployee[mapped.employee.id]) byEmployee[mapped.employee.id] = [];
      byEmployee[mapped.employee.id].push(mapped);
    }
    res.json({
      date,
      employees: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        job_title: row.job_title,
        profile_photo_url: row.profile_photo_url,
        role: row.role,
        location: { display_name: row.location_display_name },
        activity_count: row.activity_count,
        activities: byEmployee[row.id] || [],
      })),
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics', authenticateToken, requireManager, async (req, res) => {
  try {
    const { from, to } = resolveDateRange({ ...req.query, preset: req.query.preset || 'this_month' });
    const params = [];
    const clauses = [];
    if (from) {
      params.push(from);
      clauses.push(`a.activity_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      clauses.push(`a.activity_date <= $${params.length}`);
    }
    if (req.query.location_id) {
      params.push(req.query.location_id);
      clauses.push(`(a.location_id = $${params.length} OR a.secondary_location_id = $${params.length})`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const today = nairobiToday();
    const totals = await db.query(
      `SELECT
         COUNT(*)::int AS total_activities,
         COUNT(*) FILTER (WHERE a.activity_date = '${today}')::int AS activities_today,
         COUNT(DISTINCT a.employee_id)::int AS employees_with_activity
       FROM employee_activities a
       ${where}`,
      params
    );
    const byEmployee = await db.query(
      `SELECT e.id, e.name, COUNT(*)::int AS count
       FROM employee_activities a
       JOIN users e ON e.id = a.employee_id
       ${where}
       GROUP BY e.id, e.name
       ORDER BY count DESC, e.name`,
      params
    );
    const byBranch = await db.query(
      `SELECT l.display_name AS name, COUNT(*)::int AS count
       FROM employee_activities a
       JOIN locations l ON l.id = a.location_id
       ${where}
       GROUP BY l.display_name
       ORDER BY count DESC`,
      params
    );
    const byCategory = await db.query(
      `SELECT COALESCE(c.name, 'Uncategorized') AS name, COUNT(*)::int AS count
       FROM employee_activities a
       LEFT JOIN activity_categories c ON c.id = a.category_id
       ${where}
       GROUP BY COALESCE(c.name, 'Uncategorized')
       ORDER BY count DESC`,
      params
    );
    const trend = await db.query(
      `SELECT a.activity_date AS date, COUNT(*)::int AS count
       FROM employee_activities a
       ${where}
       GROUP BY a.activity_date
       ORDER BY a.activity_date`,
      params
    );
    const activeToday = await db.query(
      `SELECT COUNT(DISTINCT employee_id)::int AS count
       FROM employee_activities WHERE activity_date = $1`,
      [today]
    );
    const noneToday = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM users u
       WHERE COALESCE(u.is_active, TRUE) = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM employee_activities a
           WHERE a.employee_id = u.id AND a.activity_date = $1
         )`,
      [today]
    );
    res.json({
      from,
      to,
      total_activities: totals.rows[0].total_activities,
      activities_today: totals.rows[0].activities_today,
      active_employees_today: activeToday.rows[0].count,
      employees_with_no_entries_today: noneToday.rows[0].count,
      by_employee: byEmployee.rows,
      by_branch: byBranch.rows,
      by_category: byCategory.rows,
      daily_trend: trend.rows,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/export', authenticateToken, requireManager, async (req, res) => {
  try {
    const { where, params } = buildActivityFilters(req.query, req.user);
    const result = await db.query(
      `${ACTIVITY_SELECT} ${where} ORDER BY a.created_at ASC`,
      params
    );
    const rows = result.rows.map(mapActivity);
    if (req.query.format === 'json') {
      return res.json(rows);
    }
    const header = ['Date', 'Time', 'Employee', 'Role', 'Branch', 'Secondary Branch', 'Category', 'Activity', 'Reference', 'Created At', 'Last Edited At', 'Edited'];
    const csvLines = [header.join(',')];
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    for (const activity of rows) {
      const created = new Date(activity.created_at);
      csvLines.push([
        activity.activity_date,
        created.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' }),
        activity.employee.name,
        activity.employee.job_title || activity.employee.role,
        activity.branch.display_name,
        activity.secondary_branch ? activity.secondary_branch.display_name : '',
        activity.category ? activity.category.name : '',
        activity.activity_text,
        activity.related_reference || activity.related_order_ref || '',
        activity.created_at,
        activity.updated_at || '',
        activity.was_edited ? 'Yes' : 'No',
      ].map(escape).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="staff-activity.csv"');
    res.send(csvLines.join('\n'));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/notes', authenticateToken, requireManager, async (req, res) => {
  try {
    const params = [];
    const clauses = [];
    if (req.query.employee_id) {
      params.push(req.query.employee_id);
      clauses.push(`n.employee_id = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search.trim()}%`);
      clauses.push(`n.note ILIKE $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT n.*, e.name AS employee_name, t.name AS note_type_name, m.name AS manager_name
       FROM management_notes n
       JOIN users e ON e.id = n.employee_id
       LEFT JOIN management_note_types t ON t.id = n.note_type_id
       JOIN users m ON m.id = n.created_by
       ${where}
       ORDER BY n.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List notes error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/notes', authenticateToken, requireManager, async (req, res) => {
  try {
    const note = (req.body.note || '').trim();
    if (!note || !req.body.employee_id) {
      return res.status(400).json({ error: 'Employee and note are required' });
    }
    const employee = await getEmployeeOr404(req.body.employee_id);
    if (!employee) {
      return res.status(400).json({ error: 'Employee is invalid' });
    }
    const result = await db.query(
      `INSERT INTO management_notes (employee_id, note, note_type_id, note_date, created_by)
       VALUES ($1, $2, $3, COALESCE($4::date, (NOW() AT TIME ZONE 'Africa/Nairobi')::date), $5)
       RETURNING id`,
      [req.body.employee_id, note, req.body.note_type_id || null, req.body.note_date || null, req.user.id]
    );
    const created = await db.query(
      `SELECT n.*, e.name AS employee_name, t.name AS note_type_name, m.name AS manager_name
       FROM management_notes n
       JOIN users e ON e.id = n.employee_id
       LEFT JOIN management_note_types t ON t.id = n.note_type_id
       JOIN users m ON m.id = n.created_by
       WHERE n.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json({ message: 'Note added successfully.', note: created.rows[0] });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/settings', authenticateToken, requireManager, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM activity_reminder_settings WHERE id = 1');
    res.json(result.rows[0] || { enabled: false, hours_without_activity: 4 });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/settings', authenticateToken, requireManager, async (req, res) => {
  try {
    const hours = Number(req.body.hours_without_activity);
    if (req.body.hours_without_activity !== undefined && (!Number.isFinite(hours) || hours < 1 || hours > 12)) {
      return res.status(400).json({ error: 'Hours must be between 1 and 12' });
    }
    const result = await db.query(
      `UPDATE activity_reminder_settings
       SET enabled = COALESCE($1, enabled),
           hours_without_activity = COALESCE($2, hours_without_activity),
           updated_at = NOW(),
           updated_by = $3
       WHERE id = 1
       RETURNING *`,
      [
        req.body.enabled === undefined ? null : Boolean(req.body.enabled),
        req.body.hours_without_activity === undefined ? null : hours,
        req.user.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/reminders', authenticateToken, async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM activity_reminder_settings WHERE id = 1');
    const config = settings.rows[0] || { enabled: false, hours_without_activity: 4 };
    if (!config.enabled) {
      return res.json({ enabled: false, reminders: [] });
    }
    const today = nairobiToday();
    const hours = config.hours_without_activity || 4;
    if (isManagerRole(req.user.role)) {
      const result = await db.query(
        `SELECT u.id, u.name, u.job_title,
                MAX(a.created_at) AS last_activity_at
         FROM users u
         LEFT JOIN employee_activities a ON a.employee_id = u.id AND a.activity_date = $1
         WHERE COALESCE(u.is_active, TRUE) = TRUE
         GROUP BY u.id
         HAVING MAX(a.created_at) IS NULL
             OR MAX(a.created_at) < NOW() - ($2 || ' hours')::interval`,
        [today, String(hours)]
      );
      return res.json({ enabled: true, hours_without_activity: hours, reminders: result.rows });
    }
    const mine = await db.query(
      `SELECT MAX(created_at) AS last_activity_at
       FROM employee_activities
       WHERE employee_id = $1 AND activity_date = $2`,
      [req.user.id, today]
    );
    const last = mine.rows[0].last_activity_at;
    const due = !last || new Date(last).getTime() < Date.now() - hours * 60 * 60 * 1000;
    res.json({
      enabled: true,
      hours_without_activity: hours,
      due,
      last_activity_at: last,
    });
  } catch (error) {
    console.error('Reminders error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
