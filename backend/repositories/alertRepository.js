const { getDb } = require('../config/database');

function normalize(row) {
  if (!row) return null;
  return { ...row, active: Boolean(row.active) };
}

function findAll() {
  return getDb()
    .prepare(`
      SELECT al.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
      FROM alerts al
      INNER JOIN users u ON u.id = al.user_id
      INNER JOIN assets a ON a.id = al.asset_id
      ORDER BY al.id DESC
    `)
    .all()
    .map(normalize);
}

function findByUserId(userId) {
  return getDb()
    .prepare(`
      SELECT al.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
      FROM alerts al
      INNER JOIN users u ON u.id = al.user_id
      INNER JOIN assets a ON a.id = al.asset_id
      WHERE al.user_id = ?
      ORDER BY al.id DESC
    `)
    .all(userId)
    .map(normalize);
}

function findById(id) {
  const row = getDb()
    .prepare(`
      SELECT al.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
      FROM alerts al
      INNER JOIN users u ON u.id = al.user_id
      INNER JOIN assets a ON a.id = al.asset_id
      WHERE al.id = ?
    `)
    .get(id);
  return normalize(row);
}

function create({ user_id, asset_id, target_price, condition, active = 1 }) {
  const result = getDb()
    .prepare(`
      INSERT INTO alerts (user_id, asset_id, target_price, condition, active)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(user_id, asset_id, target_price, condition, active ? 1 : 0);
  return findById(Number(result.lastInsertRowid));
}

function update(id, fields) {
  const current = findById(id);
  if (!current) return null;

  getDb()
    .prepare(`
      UPDATE alerts
      SET asset_id = ?, target_price = ?, condition = ?, active = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    .run(
      fields.asset_id !== undefined ? fields.asset_id : current.asset_id,
      fields.target_price !== undefined ? fields.target_price : current.target_price,
      fields.condition !== undefined ? fields.condition : current.condition,
      fields.active !== undefined ? (fields.active ? 1 : 0) : (current.active ? 1 : 0),
      id
    );
  return findById(id);
}

function remove(id) {
  const result = getDb().prepare('DELETE FROM alerts WHERE id = ?').run(id);
  return result.changes > 0;
}

function findDuplicate({ user_id, asset_id, target_price, condition }) {
  return getDb()
    .prepare(`
      SELECT * FROM alerts
      WHERE user_id = ? AND asset_id = ? AND target_price = ? AND condition = ? AND active = 1
    `)
    .get(user_id, asset_id, target_price, condition);
}

module.exports = {
  findAll,
  findByUserId,
  findById,
  create,
  update,
  remove,
  findDuplicate
};
