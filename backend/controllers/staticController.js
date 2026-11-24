const fs = require('node:fs');
const path = require('node:path');
const { sendJson } = require('../utils/response');
const { AppError } = require('../exceptions/AppError');

const frontendRoot = path.join(__dirname, '..', '..', 'frontend');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function serveFile(request, response, requestPath) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    throw new AppError(405, 'Método não permitido');
  }

  if (requestPath === '/') {
    response.writeHead(302, { Location: '/index.html' });
    response.end();
    return;
  }

  const relativePath = requestPath.replace(/^[/\\]+/, '');
  const filePath = path.resolve(frontendRoot, relativePath);
  const pathFromFrontend = path.relative(frontendRoot, filePath);
  if (pathFromFrontend.startsWith(`..${path.sep}`) || path.isAbsolute(pathFromFrontend)) {
    throw new AppError(403, 'Acesso negado');
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      return sendJson(response, 404, { error: 'Arquivo não encontrado' });
    }
    const contentType = contentTypes[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
}

function syncSupabaseConfigFile() {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return;
  const target = path.join(frontendRoot, 'supabase-config.json');
  fs.writeFileSync(target, `${JSON.stringify({ url, anonKey }, null, 2)}\n`, 'utf8');
}

module.exports = { serveFile, syncSupabaseConfigFile, frontendRoot };
