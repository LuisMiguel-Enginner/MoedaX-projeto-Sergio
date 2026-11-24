const marketService = require('../services/marketService');
const { sendJson } = require('../utils/response');

async function listMarketAssets(request, response) {
  const assets = await marketService.fetchLiveAssets();
  sendJson(response, 200, {
    success: true,
    updated_at: new Date().toISOString(),
    assets
  });
}

async function getHistory(request, response, context) {
  const symbol = context.query.symbol;
  const period = context.query.period || '24h';
  const history = await marketService.fetchAssetHistory(symbol, period);
  sendJson(response, 200, {
    success: true,
    symbol: String(symbol || '').toUpperCase(),
    period,
    history
  });
}

async function getSupabaseConfig(request, response) {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  sendJson(response, 200, { url, anonKey, configured: Boolean(url && anonKey) });
}

async function me(request, response, context) {
  sendJson(response, 200, { success: true, user: context.user });
}

module.exports = {
  listMarketAssets,
  getHistory,
  getSupabaseConfig,
  me
};
