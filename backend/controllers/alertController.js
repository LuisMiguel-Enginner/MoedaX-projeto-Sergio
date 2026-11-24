const alertService = require('../services/alertService');
const { sendJson } = require('../utils/response');
const { readBody } = require('../utils/parseBody');

async function list(request, response, context) {
  const alerts = alertService.listAlerts(context.user);
  sendJson(response, 200, { success: true, alerts });
}

async function getById(request, response, context) {
  const alert = alertService.getAlert(context.params.id, context.user);
  sendJson(response, 200, { success: true, alert });
}

async function create(request, response, context) {
  const body = await readBody(request);
  const alert = alertService.createAlert(body, context.user);
  sendJson(response, 201, { success: true, alert });
}

async function update(request, response, context) {
  const body = await readBody(request);
  const alert = alertService.updateAlert(context.params.id, body, context.user);
  sendJson(response, 200, { success: true, alert });
}

async function remove(request, response, context) {
  const result = alertService.deleteAlert(context.params.id, context.user);
  sendJson(response, 200, { success: true, ...result });
}

module.exports = { list, getById, create, update, remove };
