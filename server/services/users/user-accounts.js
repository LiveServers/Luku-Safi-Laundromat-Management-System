const bcrypt = require('bcryptjs');

async function createUser(connection, { email, password, name, role, location_id }) {
  const hash = await bcrypt.hash(password, 10);
  const result = await connection.query(
    'INSERT INTO users (email, password, name, role, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, location_id, created_at',
    [email, hash, name, role, location_id]
  );
  return result.rows[0];
}

module.exports = { createUser };
