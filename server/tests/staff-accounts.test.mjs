import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Pool } from 'pg';
const require = createRequire(import.meta.url);
const schema = `staff_test_${randomUUID().replaceAll('-', '')}`;
let app, fixturePool, appPool, location;

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database.');
  const url = new URL(process.env.TEST_DATABASE_URL);
  Object.assign(process.env, {
    DB_HOST: url.hostname,
    DB_PORT: url.port || '5432',
    DB_NAME: decodeURIComponent(url.pathname.slice(1)),
    DB_USER: decodeURIComponent(url.username),
    DB_PASSWORD: decodeURIComponent(url.password),
    PGOPTIONS: `-c search_path=${schema},public`,
    JWT_SECRET: randomUUID(),
  });
  fixturePool = new Pool({ connectionString: url.href, options: process.env.PGOPTIONS });
  await fixturePool.query(`CREATE SCHEMA ${schema}`);
  for (const file of [
    '20250916033227_raspy_limit.sql',
    '20260519040211_make_shift.sql',
    '20260519040404_haga_big.sql',
  ]) {
    await fixturePool.query(readFileSync(new URL(`../../database/init/${file}`, import.meta.url), 'utf8'));
  }
  const { rows } = await fixturePool.query("SELECT id FROM locations WHERE name = 'muthiga'");
  [location] = rows;
  app = require('../index');
  appPool = require('../config/database').pool;
});

afterAll(async () => {
  await appPool?.end();
  if (fixturePool) {
    await fixturePool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await fixturePool.end();
  }
});

let server;

afterEach(async () => {
  if (server?.listening) await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

async function startAuthApi() {
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
}

function post(path, body, token) {
  return fetch(`http://127.0.0.1:${server.address().port}/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
}

test('public registration is unavailable', async () => {
  await startAuthApi();
  expect((await post('register', {})).status).toBe(404);
});

function bootstrap(account) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/create-first-owner.js'], {
      cwd: new URL('../', import.meta.url),
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let error = '';
    child.stderr.setEncoding('utf8').on('data', chunk => { error += chunk; });
    child.on('error', reject);
    child.stdin.on('error', reject);
    child.on('close', code => resolve({ code, error }));
    child.stdin.end(JSON.stringify(account));
  });
}

test('an operator can provision exactly one first owner under concurrent setup', async () => {
  const accounts = ['one', 'two'].map(name => ({
    name, email: `${name}@example.com`, password: 'test-password', location_id: location.id,
  }));
  const results = await Promise.all(accounts.map(bootstrap));
  expect(results.map(result => result.code).sort()).toEqual([0, 1]);
  expect(results.find(result => result.code === 1).error).toContain('users already exist');

  await startAuthApi();
  const login = await post('login', accounts[results.findIndex(result => result.code === 0)]);
  expect(login.status).toBe(200);
  expect((await login.json()).user.role).toBe('owner');
});

beforeEach(async () => {
  await fixturePool.query('DELETE FROM users');
});

test('only a signed-in owner can create a validated staff account', async () => {
  const owner = { name: 'Owner', email: 'owner@example.com', password: 'owner-test-password', location_id: location.id };
  const staff = { name: 'Staff', email: 'staff@example.com', password: 'staff-test-password', role: 'attendant', location_id: location.id };
  expect((await bootstrap(owner)).code).toBe(0);
  await startAuthApi();
  const { token: ownerToken } = await (await post('login', owner)).json();

  expect((await post('add-user', staff)).status).toBe(401);
  expect((await post('add-user', { ...staff, location_id: 'invalid' }, ownerToken)).status).toBe(400);
  expect((await post('add-user', { ...staff, name: 'Invalid\0Name' }, ownerToken)).status).toBe(400);
  const created = await post('add-user', staff, ownerToken);
  expect(created.status).toBe(201);
  expect((await created.json()).user).toMatchObject({ role: 'attendant', email: staff.email });
  expect((await post('add-user', staff, ownerToken)).status).toBe(400);

  const { token: staffToken } = await (await post('login', staff)).json();
  expect(staffToken).toBeTruthy();
  expect((await post('add-user', { ...staff, email: 'other@example.com' }, staffToken)).status).toBe(403);
});
