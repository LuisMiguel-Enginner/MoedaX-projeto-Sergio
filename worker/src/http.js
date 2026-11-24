export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...extra
    }
  });
}

export function error(status, message, details = null) {
  const body = { error: message };
  if (details) body.details = details;
  const extra = status === 401 ? { 'WWW-Authenticate': 'Basic realm="MoedaX API"' } : {};
  return json(body, status, extra);
}

export async function readJson(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    const err = new Error('JSON inválido');
    err.status = 400;
    throw err;
  }
}

export function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return {
      email: decoded.slice(0, idx).trim().toLowerCase(),
      password: decoded.slice(idx + 1)
    };
  } catch {
    return null;
  }
}

export function bearerToken(header) {
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}
