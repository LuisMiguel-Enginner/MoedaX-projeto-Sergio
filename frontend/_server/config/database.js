const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dbDir = path.join(__dirname, '..', 'db');
const schemaPath = path.join(dbDir, 'schema.sql');

function resolveSqlitePath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (process.env.VERCEL) return path.join(os.tmpdir(), 'moedax.db');
  return path.join(dbDir, 'moedax.db');
}

let db;
let driver = 'sqlite';

function getDb() {
  if (db) return db;

  // Na Vercel o better-sqlite3 (nativo) costuma falhar; usa JSON persistente em /tmp.
  if (process.env.VERCEL || process.env.MOEDAX_DB_DRIVER === 'json') {
    const { createJsonDatabase } = require('../db/jsonDatabase');
    db = createJsonDatabase();
    driver = 'json';
    return db;
  }

  try {
    const Database = require('better-sqlite3');
    const dbPath = resolveSqlitePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
    driver = 'sqlite';
    return db;
  } catch (error) {
    console.warn(`SQLite indisponível (${error.message}). Usando banco JSON.`);
    const { createJsonDatabase } = require('../db/jsonDatabase');
    db = createJsonDatabase();
    driver = 'json';
    return db;
  }
}

function closeDb() {
  if (db && typeof db.close === 'function') {
    db.close();
  }
  db = null;
}

module.exports = { getDb, closeDb, getDriver: () => driver };
