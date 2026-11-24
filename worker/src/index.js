import { ensureSeed } from './seed.js';
import { json, error, readJson, corsHeaders } from './http.js';
import {
  authenticate,
  requireAuth,
  requireAdmin,
  registerUser,
  createSessionToken,
  findUserByEmail,
  findUserById,
  publicUser,
  verifyPassword,
  hashPassword
} from './auth.js';
import { fetchLiveAssets, fetchAssetHistory } from './market.js';

async function handleApi(request, env, url) {
  await ensureSeed(env.DB);

  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Auth pública (substitui Supabase)
  if (path === '/api/auth/register' && method === 'POST') {
    const body = await readJson(request);
    try {
      const user = await registerUser(env.DB, body);
      const token = await createSessionToken(user, env.JWT_SECRET);
      return json({ success: true, token, user: publicUser(user) }, 201);
    } catch (err) {
      return error(err.status || 500, err.message);
    }
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await readJson(request);
    const user = await findUserByEmail(env.DB, body.email || '');
    if (!user || !(await verifyPassword(body.password || '', user.password_hash))) {
      return error(401, 'E-mail ou senha incorretos');
    }
    const token = await createSessionToken(user, env.JWT_SECRET);
    return json({ success: true, token, user: publicUser(user) });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const user = await authenticate(request, env);
    if (!user) return error(401, 'Sessão inválida');
    return json({ success: true, user });
  }

  // Mercado público
  if (path === '/api/assets' && method === 'GET') {
    const assets = await fetchLiveAssets(env.DB);
    return json({ success: true, updated_at: new Date().toISOString(), assets });
  }

  if (path === '/api/history' && method === 'GET') {
    try {
      const symbol = url.searchParams.get('symbol');
      const period = url.searchParams.get('period') || '24h';
      const history = await fetchAssetHistory(env.DB, symbol, period);
      return json({ success: true, symbol: String(symbol || '').toUpperCase(), period, history });
    } catch (err) {
      return error(err.status || 500, err.message);
    }
  }

  if (path === '/api/health' && method === 'GET') {
    return json({ ok: true, service: 'moedax-cloudflare', db: 'd1' });
  }

  if (path === '/api/me' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.response) return auth.response;
    return json({ success: true, user: auth.user });
  }

  // Users CRUD (admin)
  if (path === '/api/users' && method === 'GET') {
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;
    const rows = await env.DB.prepare('SELECT id, email, full_name, role, created_at, updated_at FROM users ORDER BY id').all();
    return json({ success: true, users: rows.results || [] });
  }

  if (path === '/api/users' && method === 'POST') {
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;
    try {
      const body = await readJson(request);
      const user = await registerUser(env.DB, body);
      return json({ success: true, user: publicUser(user) }, 201);
    } catch (err) {
      return error(err.status || 500, err.message);
    }
  }

  const userMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (userMatch) {
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;
    const id = Number(userMatch[1]);

    if (method === 'GET') {
      const user = await findUserById(env.DB, id);
      if (!user) return error(404, 'Usuário não encontrado');
      return json({ success: true, user });
    }

    if (method === 'PUT') {
      const body = await readJson(request);
      const current = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
      if (!current) return error(404, 'Usuário não encontrado');
      if (body.email && body.email.toLowerCase() !== current.email) {
        const exists = await findUserByEmail(env.DB, body.email);
        if (exists) return error(409, 'E-mail já cadastrado');
      }
      const passwordHash = body.password ? await hashPassword(body.password) : current.password_hash;
      await env.DB.prepare(`
        UPDATE users SET email = ?, password_hash = ?, full_name = ?, role = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        body.email ? String(body.email).toLowerCase() : current.email,
        passwordHash,
        body.full_name !== undefined ? String(body.full_name).trim() : current.full_name,
        body.role || current.role,
        id
      ).run();
      return json({ success: true, user: await findUserById(env.DB, id) });
    }

    if (method === 'DELETE') {
      if (auth.user.id === id) return error(409, 'Administrador não pode remover a própria conta');
      const result = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
      if (!result.meta.changes) return error(404, 'Usuário não encontrado');
      return json({ success: true, deleted: true, id });
    }
  }

  // Catalog assets CRUD
  if (path === '/api/catalog/assets' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.response) return auth.response;
    const rows = await env.DB.prepare('SELECT * FROM assets ORDER BY id').all();
    return json({ success: true, assets: (rows.results || []).map((a) => ({ ...a, active: Boolean(a.active) })) });
  }

  if (path === '/api/catalog/assets' && method === 'POST') {
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;
    const body = await readJson(request);
    if (!body.symbol || !body.name || !['crypto', 'fiat'].includes(body.type)) {
      return error(400, 'Dados de ativo inválidos');
    }
    const exists = await env.DB.prepare('SELECT id FROM assets WHERE symbol = ?').bind(String(body.symbol).toUpperCase()).first();
    if (exists) return error(409, 'Símbolo de ativo já cadastrado');
    const result = await env.DB.prepare(`
      INSERT INTO assets (symbol, name, type, icon, color, active) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      String(body.symbol).toUpperCase(),
      String(body.name).trim(),
      body.type,
      body.icon || null,
      body.color || null,
      body.active === undefined || body.active ? 1 : 0
    ).run();
    const asset = await env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(result.meta.last_row_id).first();
    return json({ success: true, asset: { ...asset, active: Boolean(asset.active) } }, 201);
  }

  const assetMatch = path.match(/^\/api\/catalog\/assets\/(\d+)$/);
  if (assetMatch) {
    const id = Number(assetMatch[1]);
    if (method === 'GET') {
      const auth = await requireAuth(request, env);
      if (auth.response) return auth.response;
      const asset = await env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first();
      if (!asset) return error(404, 'Ativo não encontrado');
      return json({ success: true, asset: { ...asset, active: Boolean(asset.active) } });
    }
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;
    if (method === 'PUT') {
      const body = await readJson(request);
      const current = await env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first();
      if (!current) return error(404, 'Ativo não encontrado');
      if (body.symbol && String(body.symbol).toUpperCase() !== current.symbol) {
        const exists = await env.DB.prepare('SELECT id FROM assets WHERE symbol = ?').bind(String(body.symbol).toUpperCase()).first();
        if (exists) return error(409, 'Símbolo de ativo já cadastrado');
      }
      await env.DB.prepare(`
        UPDATE assets SET symbol = ?, name = ?, type = ?, icon = ?, color = ?, active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        body.symbol ? String(body.symbol).toUpperCase() : current.symbol,
        body.name !== undefined ? String(body.name).trim() : current.name,
        body.type || current.type,
        body.icon !== undefined ? body.icon : current.icon,
        body.color !== undefined ? body.color : current.color,
        body.active !== undefined ? (body.active ? 1 : 0) : current.active,
        id
      ).run();
      const asset = await env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first();
      return json({ success: true, asset: { ...asset, active: Boolean(asset.active) } });
    }
    if (method === 'DELETE') {
      const result = await env.DB.prepare('DELETE FROM assets WHERE id = ?').bind(id).run();
      if (!result.meta.changes) return error(404, 'Ativo não encontrado');
      return json({ success: true, deleted: true, id });
    }
  }

  // Quotes CRUD
  if (path === '/api/quotes' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.response) return auth.response;
    const assetId = url.searchParams.get('asset_id');
    const rows = assetId
      ? await env.DB.prepare(`
          SELECT q.*, a.symbol AS asset_symbol, a.name AS asset_name
          FROM quotes q INNER JOIN assets a ON a.id = q.asset_id
          WHERE q.asset_id = ? ORDER BY q.recorded_at DESC, q.id DESC
        `).bind(Number(assetId)).all()
      : await env.DB.prepare(`
          SELECT q.*, a.symbol AS asset_symbol, a.name AS asset_name
          FROM quotes q INNER JOIN assets a ON a.id = q.asset_id
          ORDER BY q.recorded_at DESC, q.id DESC
        `).all();
    return json({ success: true, quotes: rows.results || [] });
  }

  if (path === '/api/quotes' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth.response) return auth.response;
    const body = await readJson(request);
    if (!(Number(body.price) > 0) || !body.asset_id) return error(400, 'Dados de cotação inválidos');
    const asset = await env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(Number(body.asset_id)).first();
    if (!asset) return error(404, 'Ativo não encontrado');
    if (!asset.active) return error(409, 'Não é possível registrar cotação para ativo inativo');
    const result = await env.DB.prepare('INSERT INTO quotes (asset_id, price, change_percent) VALUES (?, ?, ?)')
      .bind(Number(body.asset_id), Number(body.price), Number(body.change_percent) || 0)
      .run();
    const quote = await env.DB.prepare(`
      SELECT q.*, a.symbol AS asset_symbol, a.name AS asset_name
      FROM quotes q INNER JOIN assets a ON a.id = q.asset_id WHERE q.id = ?
    `).bind(result.meta.last_row_id).first();
    return json({ success: true, quote }, 201);
  }

  const quoteMatch = path.match(/^\/api\/quotes\/(\d+)$/);
  if (quoteMatch) {
    const id = Number(quoteMatch[1]);
    if (method === 'GET') {
      const auth = await requireAuth(request, env);
      if (auth.response) return auth.response;
      const quote = await env.DB.prepare(`
        SELECT q.*, a.symbol AS asset_symbol, a.name AS asset_name
        FROM quotes q INNER JOIN assets a ON a.id = q.asset_id WHERE q.id = ?
      `).bind(id).first();
      if (!quote) return error(404, 'Cotação não encontrada');
      return json({ success: true, quote });
    }
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;
    if (method === 'PUT') {
      const body = await readJson(request);
      const current = await env.DB.prepare('SELECT * FROM quotes WHERE id = ?').bind(id).first();
      if (!current) return error(404, 'Cotação não encontrada');
      await env.DB.prepare('UPDATE quotes SET asset_id = ?, price = ?, change_percent = ? WHERE id = ?')
        .bind(
          body.asset_id !== undefined ? Number(body.asset_id) : current.asset_id,
          body.price !== undefined ? Number(body.price) : current.price,
          body.change_percent !== undefined ? Number(body.change_percent) : current.change_percent,
          id
        ).run();
      const quote = await env.DB.prepare(`
        SELECT q.*, a.symbol AS asset_symbol, a.name AS asset_name
        FROM quotes q INNER JOIN assets a ON a.id = q.asset_id WHERE q.id = ?
      `).bind(id).first();
      return json({ success: true, quote });
    }
    if (method === 'DELETE') {
      const result = await env.DB.prepare('DELETE FROM quotes WHERE id = ?').bind(id).run();
      if (!result.meta.changes) return error(404, 'Cotação não encontrada');
      return json({ success: true, deleted: true, id });
    }
  }

  // Alerts CRUD
  if (path === '/api/alerts') {
    const auth = await requireAuth(request, env);
    if (auth.response) return auth.response;

    if (method === 'GET') {
      const rows = auth.user.role === 'administrador'
        ? await env.DB.prepare(`
            SELECT al.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
            FROM alerts al
            INNER JOIN users u ON u.id = al.user_id
            INNER JOIN assets a ON a.id = al.asset_id
            ORDER BY al.id DESC
          `).all()
        : await env.DB.prepare(`
            SELECT al.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
            FROM alerts al
            INNER JOIN users u ON u.id = al.user_id
            INNER JOIN assets a ON a.id = al.asset_id
            WHERE al.user_id = ?
            ORDER BY al.id DESC
          `).bind(auth.user.id).all();
      return json({
        success: true,
        alerts: (rows.results || []).map((item) => ({ ...item, active: Boolean(item.active) }))
      });
    }

    if (method === 'POST') {
      const body = await readJson(request);
      if (!(Number(body.target_price) > 0) || !['above', 'below'].includes(body.condition) || !body.asset_id) {
        return error(400, 'Dados de alerta inválidos');
      }
      const asset = await env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(Number(body.asset_id)).first();
      if (!asset) return error(404, 'Ativo não encontrado');
      if (!asset.active) return error(409, 'Não é possível criar alerta para ativo inativo');
      const duplicate = await env.DB.prepare(`
        SELECT id FROM alerts
        WHERE user_id = ? AND asset_id = ? AND target_price = ? AND condition = ? AND active = 1
      `).bind(auth.user.id, Number(body.asset_id), Number(body.target_price), body.condition).first();
      if (duplicate) return error(409, 'Já existe um alerta ativo idêntico para este ativo');
      const result = await env.DB.prepare(`
        INSERT INTO alerts (user_id, asset_id, target_price, condition, active)
        VALUES (?, ?, ?, ?, 1)
      `).bind(auth.user.id, Number(body.asset_id), Number(body.target_price), body.condition).run();
      const alert = await env.DB.prepare(`
        SELECT al.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
        FROM alerts al
        INNER JOIN users u ON u.id = al.user_id
        INNER JOIN assets a ON a.id = al.asset_id
        WHERE al.id = ?
      `).bind(result.meta.last_row_id).first();
      return json({ success: true, alert: { ...alert, active: Boolean(alert.active) } }, 201);
    }
  }

  const alertMatch = path.match(/^\/api\/alerts\/(\d+)$/);
  if (alertMatch) {
    const auth = await requireAuth(request, env);
    if (auth.response) return auth.response;
    const id = Number(alertMatch[1]);
    const current = await env.DB.prepare('SELECT * FROM alerts WHERE id = ?').bind(id).first();
    if (!current) return error(404, 'Alerta não encontrado');
    if (auth.user.role !== 'administrador' && current.user_id !== auth.user.id) {
      return error(403, 'Você só pode gerenciar os próprios alertas');
    }

    if (method === 'GET') {
      const alert = await env.DB.prepare(`
        SELECT al.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
        FROM alerts al
        INNER JOIN users u ON u.id = al.user_id
        INNER JOIN assets a ON a.id = al.asset_id
        WHERE al.id = ?
      `).bind(id).first();
      return json({ success: true, alert: { ...alert, active: Boolean(alert.active) } });
    }
    if (method === 'PUT') {
      const body = await readJson(request);
      await env.DB.prepare(`
        UPDATE alerts SET asset_id = ?, target_price = ?, condition = ?, active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        body.asset_id !== undefined ? Number(body.asset_id) : current.asset_id,
        body.target_price !== undefined ? Number(body.target_price) : current.target_price,
        body.condition || current.condition,
        body.active !== undefined ? (body.active ? 1 : 0) : current.active,
        id
      ).run();
      const alert = await env.DB.prepare(`
        SELECT al.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
        FROM alerts al
        INNER JOIN users u ON u.id = al.user_id
        INNER JOIN assets a ON a.id = al.asset_id
        WHERE al.id = ?
      `).bind(id).first();
      return json({ success: true, alert: { ...alert, active: Boolean(alert.active) } });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM alerts WHERE id = ?').bind(id).run();
      return json({ success: true, deleted: true, id });
    }
  }

  // Watchlist CRUD
  if (path === '/api/watchlist') {
    const auth = await requireAuth(request, env);
    if (auth.response) return auth.response;

    if (method === 'GET') {
      const rows = auth.user.role === 'administrador'
        ? await env.DB.prepare(`
            SELECT w.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
            FROM watchlist_items w
            INNER JOIN users u ON u.id = w.user_id
            INNER JOIN assets a ON a.id = w.asset_id
            ORDER BY w.id DESC
          `).all()
        : await env.DB.prepare(`
            SELECT w.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
            FROM watchlist_items w
            INNER JOIN users u ON u.id = w.user_id
            INNER JOIN assets a ON a.id = w.asset_id
            WHERE w.user_id = ?
            ORDER BY w.id DESC
          `).bind(auth.user.id).all();
      return json({ success: true, items: rows.results || [] });
    }

    if (method === 'POST') {
      const body = await readJson(request);
      if (!body.asset_id) return error(400, 'Dados de favorito inválidos');
      const asset = await env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(Number(body.asset_id)).first();
      if (!asset) return error(404, 'Ativo não encontrado');
      if (!asset.active) return error(409, 'Não é possível favoritar ativo inativo');
      const exists = await env.DB.prepare('SELECT id FROM watchlist_items WHERE user_id = ? AND asset_id = ?')
        .bind(auth.user.id, Number(body.asset_id)).first();
      if (exists) return error(409, 'Ativo já está na lista de favoritos do usuário');
      const result = await env.DB.prepare('INSERT INTO watchlist_items (user_id, asset_id, notes) VALUES (?, ?, ?)')
        .bind(auth.user.id, Number(body.asset_id), body.notes || null).run();
      const item = await env.DB.prepare(`
        SELECT w.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
        FROM watchlist_items w
        INNER JOIN users u ON u.id = w.user_id
        INNER JOIN assets a ON a.id = w.asset_id
        WHERE w.id = ?
      `).bind(result.meta.last_row_id).first();
      return json({ success: true, item }, 201);
    }
  }

  const watchMatch = path.match(/^\/api\/watchlist\/(\d+)$/);
  if (watchMatch) {
    const auth = await requireAuth(request, env);
    if (auth.response) return auth.response;
    const id = Number(watchMatch[1]);
    const current = await env.DB.prepare('SELECT * FROM watchlist_items WHERE id = ?').bind(id).first();
    if (!current) return error(404, 'Favorito não encontrado');
    if (auth.user.role !== 'administrador' && current.user_id !== auth.user.id) {
      return error(403, 'Você só pode gerenciar a própria lista de favoritos');
    }
    if (method === 'GET') {
      const item = await env.DB.prepare(`
        SELECT w.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
        FROM watchlist_items w
        INNER JOIN users u ON u.id = w.user_id
        INNER JOIN assets a ON a.id = w.asset_id
        WHERE w.id = ?
      `).bind(id).first();
      return json({ success: true, item });
    }
    if (method === 'PUT') {
      const body = await readJson(request);
      await env.DB.prepare('UPDATE watchlist_items SET asset_id = ?, notes = ? WHERE id = ?')
        .bind(
          body.asset_id !== undefined ? Number(body.asset_id) : current.asset_id,
          body.notes !== undefined ? body.notes : current.notes,
          id
        ).run();
      const item = await env.DB.prepare(`
        SELECT w.*, u.email AS user_email, a.symbol AS asset_symbol, a.name AS asset_name
        FROM watchlist_items w
        INNER JOIN users u ON u.id = w.user_id
        INNER JOIN assets a ON a.id = w.asset_id
        WHERE w.id = ?
      `).bind(id).first();
      return json({ success: true, item });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM watchlist_items WHERE id = ?').bind(id).run();
      return json({ success: true, deleted: true, id });
    }
  }

  return error(404, 'Endpoint não encontrado');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, url);
      }

      // Raiz sem sessão: envia para login (navegação inicial)
      if ((url.pathname === '/' || url.pathname === '/index.html') && request.method === 'GET') {
        // Cookie/token fica no localStorage (client-side); a proteção forte está no HTML/JS.
        // Mantém index acessível após login; o redirect imediato no HTML cobre o Vercel.
      }

      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return error(404, 'Não encontrado');
    } catch (err) {
      console.error(err);
      return error(err.status || 500, err.message || 'Erro interno do servidor');
    }
  }
};
