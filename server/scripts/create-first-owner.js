const { readFileSync } = require('node:fs');
const db = require('../config/database');
const { createUser } = require('../services/users/user-accounts');
const { createStaffAccountSchema } = require('../../shared/schemas/staff-account-schema');
const { z } = require('zod');
const { FOREIGN_KEY_VIOLATION } = require('../db/sqlstate');

const staffAccountSchema = createStaffAccountSchema(z);

async function main() {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const account = staffAccountSchema.safeParse({ ...input, role: 'owner' });
  if (!account.success) {
    console.error(`Invalid owner details: ${account.error.issues[0].path.join('.')}`);
    process.exitCode = 1;
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Serialize bootstrap with other attempts and concurrent user inserts.
    await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
    const existing = await client.query('SELECT 1 FROM users LIMIT 1');
    if (existing.rowCount > 0) {
      console.error('First-owner setup is unavailable because users already exist.');
      await client.query('ROLLBACK');
      process.exitCode = 1;
      return;
    }
    await createUser(client, account.data);
    await client.query('COMMIT');
    console.log('First owner created. Sign in with the new account.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main().catch(error => {
  console.error(error.code === FOREIGN_KEY_VIOLATION
    ? 'Choose an existing location ID.'
    : 'Setup failed. Check the JSON input and database configuration.');
  process.exitCode = 1;
}).finally(() => db.pool.end());
