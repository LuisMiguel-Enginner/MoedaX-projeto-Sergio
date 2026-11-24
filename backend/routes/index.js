const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');
const assetController = require('../controllers/assetController');
const quoteController = require('../controllers/quoteController');
const alertController = require('../controllers/alertController');
const watchlistController = require('../controllers/watchlistController');
const marketController = require('../controllers/marketController');

function route(method, pattern, handler) {
  return { method, pattern, handler: asyncHandler(handler) };
}

const routes = [
  // Mercado (público — compatível com frontend)
  route('GET', '/api/assets', marketController.listMarketAssets),
  route('GET', '/api/history', marketController.getHistory),
  route('GET', '/api/supabase-config', marketController.getSupabaseConfig),
  route('GET', '/api/me', requireAuth(marketController.me)),

  // Users (CRUD — admin)
  route('GET', '/api/users', requireAdmin(userController.list)),
  route('GET', '/api/users/:id', requireAdmin(userController.getById)),
  route('POST', '/api/users', requireAdmin(userController.create)),
  route('PUT', '/api/users/:id', requireAdmin(userController.update)),
  route('DELETE', '/api/users/:id', requireAdmin(userController.remove)),

  // Assets CRUD (persistidos no SQLite)
  route('GET', '/api/catalog/assets', requireAuth(assetController.list)),
  route('GET', '/api/catalog/assets/:id', requireAuth(assetController.getById)),
  route('POST', '/api/catalog/assets', requireAdmin(assetController.create)),
  route('PUT', '/api/catalog/assets/:id', requireAdmin(assetController.update)),
  route('DELETE', '/api/catalog/assets/:id', requireAdmin(assetController.remove)),

  // Quotes CRUD
  route('GET', '/api/quotes', requireAuth(quoteController.list)),
  route('GET', '/api/quotes/:id', requireAuth(quoteController.getById)),
  route('POST', '/api/quotes', requireAuth(quoteController.create)),
  route('PUT', '/api/quotes/:id', requireAdmin(quoteController.update)),
  route('DELETE', '/api/quotes/:id', requireAdmin(quoteController.remove)),

  // Alerts CRUD
  route('GET', '/api/alerts', requireAuth(alertController.list)),
  route('GET', '/api/alerts/:id', requireAuth(alertController.getById)),
  route('POST', '/api/alerts', requireAuth(alertController.create)),
  route('PUT', '/api/alerts/:id', requireAuth(alertController.update)),
  route('DELETE', '/api/alerts/:id', requireAuth(alertController.remove)),

  // Watchlist CRUD
  route('GET', '/api/watchlist', requireAuth(watchlistController.list)),
  route('GET', '/api/watchlist/:id', requireAuth(watchlistController.getById)),
  route('POST', '/api/watchlist', requireAuth(watchlistController.create)),
  route('PUT', '/api/watchlist/:id', requireAuth(watchlistController.update)),
  route('DELETE', '/api/watchlist/:id', requireAuth(watchlistController.remove))
];

function pathMatches(pattern, pathname) {
  const params = {};
  const routeParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (routeParts.length !== pathParts.length) return null;

  for (let i = 0; i < routeParts.length; i += 1) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = pathParts[i];
    } else if (routeParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function matchRoute(method, pathname) {
  let pathExists = false;
  for (const item of routes) {
    const params = pathMatches(item.pattern, pathname);
    if (!params) continue;
    pathExists = true;
    if (item.method === method) {
      return { handler: item.handler, params, allowed: true };
    }
  }
  if (pathExists) return { handler: null, params: {}, allowed: false };
  return null;
}

module.exports = { routes, matchRoute };
