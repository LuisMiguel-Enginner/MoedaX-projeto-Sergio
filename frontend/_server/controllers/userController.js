const userService = require('../services/userService');
const { sendJson } = require('../utils/response');
const { readBody } = require('../utils/parseBody');

async function list(request, response) {
  const users = await userService.listUsers();
  sendJson(response, 200, { success: true, users });
}

async function getById(request, response, context) {
  const user = await userService.getUser(context.params.id);
  sendJson(response, 200, { success: true, user });
}

async function create(request, response) {
  const body = await readBody(request);
  const user = await userService.createUser(body);
  sendJson(response, 201, { success: true, user });
}

async function update(request, response, context) {
  const body = await readBody(request);
  const user = await userService.updateUser(context.params.id, body);
  sendJson(response, 200, { success: true, user });
}

async function remove(request, response, context) {
  const result = await userService.deleteUser(context.params.id, context.user);
  sendJson(response, 200, { success: true, ...result });
}

module.exports = { list, getById, create, update, remove };
