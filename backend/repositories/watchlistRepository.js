const { getDb } = require('../config/database');

function findAll() {
  return getDb()
    .prepare(`
      SELECT w.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
      FROM watchlist_items w
      INNER JOIN users u ON u.id = w.user_id
      INNER JOIN assets a ON a.id = w.asset_id
      ORDER BY w.id DESC
    `)
    .all();
}

function findByUserId(userId) {
  return getDb()
    .prepare(`
      SELECT w.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
      FROM watchlist_items w
      INNER JOIN users u ON u.id = w.user_id
      INNER JOIN assets a ON a.id = w.asset_id
      WHERE w.user_id = ?
      ORDER BY w.id DESC
    `)
    .all(userId);
}

function findById(id) {
  return getDb()
    .prepare(`
      SELECT w.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
      FROM watchlist_items w
      INNER JOIN users u ON u.id = w.user_id
      INNER JOIN assets a ON a.id = w.asset_id
      WHERE w.id = ?
    `)
    .get(id);
}

function findByUserAndAsset(userId, assetId) {
  return getDb()
    .prepare('SELECT * FROM watchlist_items WHERE user_id = ? AND asset_id = ?')
    .get(userId, assetId);
}

function create({ user_id, asset_id, notes = null }) {
  const result = getDb()
    .prepare(`
      INSERT INTO watchlist_items (user_id, asset_id, notes)
      VALUES (?, ?, ?)
    `)
    .run(user_id, asset_id, notes);
  return findById(Number(result.lastInsertRowid));
}

function update(id, fields) {
  const current = findById(id);
  if (!current) return null;

  getDb()
    .prepare(`
      UPDATE watchlist_items
      SET asset_id = ?, notes = ?
      WHERE id = ?
    `)
    .run(
      fields.asset_id !== undefined ? fields.asset_id : current.asset_id,
      fields.notes !== undefined ? fields.notes : current.notes,
      id
    );
  return findById(id);
}

function remove(id) {
  const result = getDb().prepare('DELETE FROM watchlist_items WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  findAll,
  findByUserId,
  findById,
  findByUserAndAsset,
  create,
  update,
  remove
};
