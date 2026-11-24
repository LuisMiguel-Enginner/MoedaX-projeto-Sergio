const assetService = require('../services/assetService');
const { sendJson } = require('../utils/response');
const { readBody } = require('../utils/parseBody');

async function list(request, response, context) {
  const activeOnly = context.query.active === '1' || context.query.active === 'true';
  const assets = assetService.listAssets({ activeOnly });
  sendJson(response, 200, { success: true, assets });
}

async function getById(request, response, context) {
  const asset = assetService.getAsset(context.params.id);
  sendJson(response, 200, { success: true, asset });
}

async function create(request, response) {
  const body = await readBody(request);
  const asset = assetService.createAsset(body);
  sendJson(response, 201, { success: true, asset });
}

async function update(request, response, context) {
  const body = await readBody(request);
  const asset = assetService.updateAsset(context.params.id, body);
  sendJson(response, 200, { success: true, asset });
}

async function remove(request, response, context) {
  const result = assetService.deleteAsset(context.params.id);
  sendJson(response, 200, { success: true, ...result });
}

module.exports = { list, getById, create, update, remove };
