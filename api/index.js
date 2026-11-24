const path = require('node:path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
}

const { getDb } = require('../backend/config/database');
const { seedDatabase } = require('../backend/db/seed');
const { handleRequest } = require('../backend/app');

let bootstrapPromise;

async function ensureReady() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      getDb();
      await seedDatabase();
    })();
  }
  return bootstrapPromise;
}

module.exports = async function handler(request, response) {
  try {
    await ensureReady();

    // Normaliza URL no catch-all da Vercel (/api/[...path])
    const original = request.url || '/';
    if (!original.startsWith('/api')) {
      const suffix = original.startsWith('/') ? original : `/${original}`;
      request.url = `/api${suffix === '/' ? '' : suffix}`;
    }

    await handleRequest(request, response);
  } catch (error) {
    console.error('API handler error:', error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: 'Erro interno do servidor' }));
    }
  }
};
