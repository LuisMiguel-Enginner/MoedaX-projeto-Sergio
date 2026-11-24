function sendJson(response, statusCode, payload, extraHeaders = {}) {
  if (response.headersSent) return;

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...extraHeaders
  };

  if (typeof response.writeHead === 'function') {
    response.writeHead(statusCode, headers);
  } else {
    response.statusCode = statusCode;
    Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));
  }

  response.end(statusCode === 204 ? undefined : JSON.stringify(payload));
}

function sendError(response, statusCode, message, details = null) {
  const body = { error: message };
  if (details) body.details = details;
  const extra = statusCode === 401
    ? { 'WWW-Authenticate': 'Basic realm="MoedaX API"' }
    : {};
  sendJson(response, statusCode, body, extra);
}

module.exports = { sendJson, sendError };
