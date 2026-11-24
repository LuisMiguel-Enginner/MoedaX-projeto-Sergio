const http = require('node:http');
const path = require('node:path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
}

const { handleRequest } = require('./app');
const { getDb } = require('./config/database');
const { seedDatabase } = require('./db/seed');
const { syncSupabaseConfigFile } = require('./controllers/staticController');

const port = process.env.PORT || 3000;

async function bootstrap() {
  getDb();
  const seedResult = await seedDatabase();
  syncSupabaseConfigFile();

  const server = http.createServer((request, response) => {
    handleRequest(request, response);
  });

  server.listen(port, () => {
    console.log(`MoedaX disponível em http://localhost:${port}/`);
    console.log('API autenticada via HTTP Basic Auth (Authorization: Basic ...)');
    if (seedResult.seeded) {
      console.log('Banco SQLite inicializado com usuários demo:');
      console.log('  admin@moedax.local / admin123 (administrador)');
      console.log('  investidor@moedax.local / invest123 (investidor)');
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.warn('Aviso: configure SUPABASE_URL e SUPABASE_ANON_KEY no .env para o frontend legado.');
    }
  });
}

bootstrap().catch((error) => {
  console.error('Falha ao iniciar o servidor:', error);
  process.exit(1);
});
