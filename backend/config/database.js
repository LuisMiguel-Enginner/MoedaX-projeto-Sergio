const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const dbDir = path.join(__dirname, '..', 'db');
const schemaPath = path.join(dbDir, 'schema.sql');

function resolveDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  // No Vercel o filesystem é efêmero; /tmp é gravável por instância.
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'moedax.db');
  }
  return path.join(dbDir, 'moedax.db');
}

const dbPath = resolveDbPath();

let db;

function getDb() {
  if (db) return db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb, dbPath };
