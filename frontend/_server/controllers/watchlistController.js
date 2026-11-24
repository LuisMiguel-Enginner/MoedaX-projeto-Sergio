const watchlistService = require('../services/watchlistService');
const { sendJson } = require('../utils/response');
const { readBody } = require('../utils/parseBody');

async function list(request, response, context) {
  const items = watchlistService.listWatchlist(context.user);
  sendJson(response, 200, { success: true, items });
}

async function getById(request, response, context) {
  const item = watchlistService.getWatchlistItem(context.params.id, context.user);
  sendJson(response, 200, { success: true, item });
}

async function create(request, response, context) {
  const body = await readBody(request);
  const item = watchlistService.createWatchlistItem(body, context.user);
  sendJson(response, 201, { success: true, item });
}

async function update(request, response, context) {
  const body = await readBody(request);
  const item = watchlistService.updateWatchlistItem(context.params.id, body, context.user);
  sendJson(response, 200, { success: true, item });
}

async function remove(request, response, context) {
  const result = watchlistService.deleteWatchlistItem(context.params.id, context.user);
  sendJson(response, 200, { success: true, ...result });
}

module.exports = { list, getById, create, update, remove };
