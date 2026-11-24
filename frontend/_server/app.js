const { matchRoute } = require('./routes');
const { handleError } = require('./middleware/errorHandler');
const { sendJson } = require('./utils/response');
const { serveFile } = require('./controllers/staticController');
const { AppError } = require('./exceptions/AppError');

async function handleRequest(request, response) {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

    if (request.method === 'OPTIONS') {
      return sendJson(response, 204, {});
    }

    const matched = matchRoute(request.method, requestUrl.pathname);
    if (matched) {
      if (!matched.allowed) {
        throw new AppError(405, 'Método não permitido');
      }
      const query = Object.fromEntries(requestUrl.searchParams.entries());
      return matched.handler(request, response, {
        params: matched.params,
        query
      });
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      throw new AppError(404, 'Endpoint não encontrado');
    }

    return serveFile(request, response, requestUrl.pathname);
  } catch (error) {
    return handleError(error, response);
  }
}

module.exports = { handleRequest };
