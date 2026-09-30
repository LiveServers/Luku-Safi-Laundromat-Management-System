const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const TZ = 'Africa/Nairobi';

function nairobiToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function nairobiDateOffset(days) {
  const now = new Date();
  const asNairobi = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  asNairobi.setDate(asNairobi.getDate() + days);
  const year = asNairobi.getFullYear();
  const month = String(asNairobi.getMonth() + 1).padStart(2, '0');
  const day = String(asNairobi.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function splitSqlStatements(sql) {
  return sql
    .replace(/--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function ensureStaffActivitySchema() {
  const sqlPath = path.join(__dirname, '../../database/init/20260914_staff_activity.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  for (const statement of splitSqlStatements(sql)) {
    try {
      await db.query(statement);
    } catch (error) {
      const message = error.message || '';
      if (message.includes('already exists') || message.includes('duplicate')) {
        continue;
      }
      throw error;
    }
  }
  await seedDemoStaff();
}

async function seedDemoStaff() {
  const locations = await db.query('SELECT id, name FROM locations');
  const byName = Object.fromEntries(locations.rows.map((row) => [row.name, row.id]));
  const muthigaId = byName.muthiga;
  const gitaruId = byName.gitaru;
  if (!muthigaId || !gitaruId) {
    return;
  }

  const passwordHash = await bcrypt.hash('LukuSafi123!', 10);
  const staff = [
    {
      email: 'maryanne@lukusafi.local',
      name: 'Maryanne',
      job_title: 'Customer Service & Laundry Operations',
      location_id: muthigaId,
      role: 'attendant',
    },
    {
      email: 'bonny@lukusafi.local',
      name: 'Bonny',
      job_title: 'Rider',
      location_id: muthigaId,
      role: 'attendant',
    },
    {
      email: 'esther@lukusafi.local',
      name: 'Esther',
      job_title: 'Laundry Operations',
      location_id: gitaruId,
      role: 'attendant',
    },
  ];

  const employeeIds = {};
  for (const person of staff) {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [person.email]);
    if (existing.rows.length) {
      employeeIds[person.name] = existing.rows[0].id;
      await db.query(
        `UPDATE users
         SET job_title = COALESCE(job_title, $2),
             location_id = COALESCE(location_id, $3),
             is_active = TRUE
         WHERE id = $1`,
        [existing.rows[0].id, person.job_title, person.location_id]
      );
      continue;
    }
    const inserted = await db.query(
      `INSERT INTO users (email, password, name, role, location_id, job_title, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id`,
      [person.email, passwordHash, person.name, person.role, person.location_id, person.job_title]
    );
    employeeIds[person.name] = inserted.rows[0].id;
  }

  const count = await db.query('SELECT COUNT(*)::int AS total FROM employee_activities');
  if (count.rows[0].total > 0) {
    return;
  }

  const categories = await db.query('SELECT id, name FROM activity_categories');
  const cat = Object.fromEntries(categories.rows.map((row) => [row.name, row.id]));
  const today = nairobiToday();
  const samples = [
    {
      employee: 'Maryanne',
      location_id: muthigaId,
      category: 'Laundry Received',
      text: 'Received and sorted 3 customer orders.',
    },
    {
      employee: 'Maryanne',
      location_id: muthigaId,
      category: 'Washing',
      text: 'Washed Order #123 and prepared two duvets for drying.',
    },
    {
      employee: 'Maryanne',
      location_id: muthigaId,
      category: 'Customer Follow-up',
      text: 'Called customer to confirm laundry was ready.',
    },
    {
      employee: 'Bonny',
      location_id: muthigaId,
      secondary_location_id: gitaruId,
      category: 'Delivery',
      text: 'Delivered 3 completed orders and picked up laundry from two customers.',
    },
    {
      employee: 'Bonny',
      location_id: muthigaId,
      secondary_location_id: gitaruId,
      category: 'Branch Transfer',
      text: 'Moved a bag of washed laundry from Muthiga to Gitaru.',
    },
    {
      employee: 'Esther',
      location_id: gitaruId,
      category: 'Laundry Received',
      text: 'Sorted customer laundry into whites, brights and darks.',
    },
    {
      employee: 'Esther',
      location_id: gitaruId,
      category: 'Cleaning',
      text: 'Opened the Gitaru branch and prepared machines for the day.',
    },
  ];

  for (const sample of samples) {
    const employeeId = employeeIds[sample.employee];
    if (!employeeId) continue;
    await db.query(
      `INSERT INTO employee_activities (
         employee_id, location_id, secondary_location_id, category_id,
         activity_text, activity_date, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $1)`,
      [
        employeeId,
        sample.location_id,
        sample.secondary_location_id || null,
        cat[sample.category] || null,
        sample.text,
        today,
      ]
    );
  }
}

module.exports = {
  ensureStaffActivitySchema,
  nairobiToday,
  nairobiDateOffset,
  TZ,
};
