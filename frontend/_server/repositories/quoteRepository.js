const { getDb } = require('../config/database');

function findAll() {
  return getDb()
    .prepare(`
      SELECT q.*, a.symbol AS asset_symbol, a.name AS asset_name
      FROM quotes q
      INNER JOIN assets a ON a.id = q.asset_id
      ORDER BY q.recorded_at DESC, q.id DESC
    `)
    .all();
}

function findById(id) {
  return getDb()
    .prepare(`
      SELECT q.*, a.symbol AS asset_symbol, a.name AS asset_name
      FROM quotes q
      INNER JOIN assets a ON a.id = q.asset_id
      WHERE q.id = ?
    `)
    .get(id);
}

function findByAssetId(assetId) {
  return getDb()
    .prepare(`
      SELECT q.*, a.symbol AS asset_symbol, a.name AS asset_name
      FROM quotes q
      INNER JOIN assets a ON a.id = q.asset_id
      WHERE q.asset_id = ?
      ORDER BY q.recorded_at DESC, q.id DESC
    `)
    .all(assetId);
}

function create({ asset_id, price, change_percent = 0, recorded_at = null }) {
  const result = recorded_at
    ? getDb()
      .prepare(`
          INSERT INTO quotes (asset_id, price, change_percent, recorded_at)
          VALUES (?, ?, ?, ?)
        `)
      .run(asset_id, price, change_percent, recorded_at)
    : getDb()
      .prepare(`
          INSERT INTO quotes (asset_id, price, change_percent)
          VALUES (?, ?, ?)
        `)
      .run(asset_id, price, change_percent);

  return findById(Number(result.lastInsertRowid));
}

function update(id, fields) {
  const current = findById(id);
  if (!current) return null;

  getDb()
    .prepare(`
      UPDATE quotes
      SET asset_id = ?, price = ?, change_percent = ?, recorded_at = ?
      WHERE id = ?
    `)
    .run(
      fields.asset_id !== undefined ? fields.asset_id : current.asset_id,
      fields.price !== undefined ? fields.price : current.price,
      fields.change_percent !== undefined ? fields.change_percent : current.change_percent,
      fields.recorded_at !== undefined ? fields.recorded_at : current.recorded_at,
      id
    );
  return findById(id);
}

function remove(id) {
  const result = getDb().prepare('DELETE FROM quotes WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  findAll,
  findById,
  findByAssetId,
  create,
  update,
  remove
};
