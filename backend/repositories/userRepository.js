const { getDb } = require('../config/database');

function toPublic(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

function findAll() {
  return getDb()
    .prepare('SELECT id, email, full_name, role, created_at, updated_at FROM users ORDER BY id')
    .all();
}

function findById(id) {
  return getDb()
    .prepare('SELECT id, email, full_name, role, created_at, updated_at FROM users WHERE id = ?')
    .get(id);
}

function findByEmail(email) {
  return getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(String(email).toLowerCase());
}

function create({ email, password_hash, full_name, role }) {
  const result = getDb()
    .prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `)
    .run(String(email).toLowerCase(), password_hash, full_name, role);
  return findById(Number(result.lastInsertRowid));
}

function update(id, { email, password_hash, full_name, role }) {
  const current = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!current) return null;

  getDb()
    .prepare(`
      UPDATE users
      SET email = ?, password_hash = ?, full_name = ?, role = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    .run(
      email !== undefined ? String(email).toLowerCase() : current.email,
      password_hash !== undefined ? password_hash : current.password_hash,
      full_name !== undefined ? full_name : current.full_name,
      role !== undefined ? role : current.role,
      id
    );
  return findById(id);
}

function remove(id) {
  const result = getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  toPublic,
  findAll,
  findById,
  findByEmail,
  create,
  update,
  remove
};
