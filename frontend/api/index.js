process.env.VERCEL = process.env.VERCEL || '1';
process.env.MOEDAX_DB_DRIVER = process.env.MOEDAX_DB_DRIVER || 'json';

const { getDb } = require('../_server/config/database');
const { seedDatabase } = require('../_server/db/seed');
const { handleRequest } = require('../_server/app');

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
