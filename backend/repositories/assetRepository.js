const { getDb } = require('../config/database');

function findAll({ activeOnly = false } = {}) {
  const sql = activeOnly
    ? 'SELECT * FROM assets WHERE active = 1 ORDER BY id'
    : 'SELECT * FROM assets ORDER BY id';
  return getDb().prepare(sql).all().map(normalize);
}

function findById(id) {
  const row = getDb().prepare('SELECT * FROM assets WHERE id = ?').get(id);
  return normalize(row);
}

function findBySymbol(symbol) {
  const row = getDb()
    .prepare('SELECT * FROM assets WHERE symbol = ?')
    .get(String(symbol).toUpperCase());
  return normalize(row);
}

function create({ symbol, name, type, icon = null, color = null, active = 1 }) {
  const result = getDb()
    .prepare(`
      INSERT INTO assets (symbol, name, type, icon, color, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(String(symbol).toUpperCase(), name, type, icon, color, active ? 1 : 0);
  return findById(Number(result.lastInsertRowid));
}

function update(id, fields) {
  const current = findById(id);
  if (!current) return null;

  getDb()
    .prepare(`
      UPDATE assets
      SET symbol = ?, name = ?, type = ?, icon = ?, color = ?, active = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    .run(
      fields.symbol !== undefined ? String(fields.symbol).toUpperCase() : current.symbol,
      fields.name !== undefined ? fields.name : current.name,
      fields.type !== undefined ? fields.type : current.type,
      fields.icon !== undefined ? fields.icon : current.icon,
      fields.color !== undefined ? fields.color : current.color,
      fields.active !== undefined ? (fields.active ? 1 : 0) : (current.active ? 1 : 0),
      id
    );
  return findById(id);
}

function remove(id) {
  const result = getDb().prepare('DELETE FROM assets WHERE id = ?').run(id);
  return result.changes > 0;
}

function normalize(row) {
  if (!row) return null;
  return { ...row, active: Boolean(row.active) };
}

module.exports = {
  findAll,
  findById,
  findBySymbol,
  create,
  update,
  remove
};
