const quoteService = require('../services/quoteService');
const { sendJson } = require('../utils/response');
const { readBody } = require('../utils/parseBody');

async function list(request, response, context) {
  const quotes = quoteService.listQuotes(context.query.asset_id);
  sendJson(response, 200, { success: true, quotes });
}

async function getById(request, response, context) {
  const quote = quoteService.getQuote(context.params.id);
  sendJson(response, 200, { success: true, quote });
}

async function create(request, response) {
  const body = await readBody(request);
  const quote = quoteService.createQuote(body);
  sendJson(response, 201, { success: true, quote });
}

async function update(request, response, context) {
  const body = await readBody(request);
  const quote = quoteService.updateQuote(context.params.id, body);
  sendJson(response, 200, { success: true, quote });
}

async function remove(request, response, context) {
  const result = quoteService.deleteQuote(context.params.id);
  sendJson(response, 200, { success: true, ...result });
}

module.exports = { list, getById, create, update, remove };
