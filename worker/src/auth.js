import { hashPassword, verifyPassword, signToken, verifyToken } from './crypto.js';
import { error, parseBasicAuth, bearerToken } from './http.js';

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    fullName: user.full_name,
    firstName: String(user.full_name || '').split(/\s+/)[0] || 'Usuário',
    role: user.role,
    accountType: user.role,
    accountLabel: user.role === 'administrador' ? 'Administrador' : 'Conta pessoal'
  };
}

export async function findUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(String(email).toLowerCase()).first();
}

export async function findUserById(db, id) {
  return db.prepare('SELECT id, email, full_name, role, created_at, updated_at FROM users WHERE id = ?').bind(id).first();
}

export async function createSessionToken(user, secret) {
  return signToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
    },
    secret
  );
}

export async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = bearerToken(authHeader);
  if (token) {
    const payload = await verifyToken(token, env.JWT_SECRET);
    if (!payload?.sub) return null;
    const user = await findUserById(env.DB, payload.sub);
    return publicUser(user);
  }

  const basic = parseBasicAuth(authHeader);
  if (!basic) return null;
  const user = await findUserByEmail(env.DB, basic.email);
  if (!user) return null;
  const ok = await verifyPassword(basic.password, user.password_hash);
  if (!ok) return null;
  return publicUser(user);
}

export async function requireAuth(request, env) {
  const user = await authenticate(request, env);
  if (!user) return { user: null, response: error(401, 'Autenticação obrigatória') };
  return { user, response: null };
}

export async function requireAdmin(request, env) {
  const result = await requireAuth(request, env);
  if (result.response) return result;
  if (result.user.role !== 'administrador') {
    return { user: result.user, response: error(403, 'Acesso restrito a administradores') };
  }
  return result;
}

export async function registerUser(db, { email, password, full_name, role = 'investidor' }) {
  if (!email || !String(email).includes('@')) {
    const err = new Error('email inválido');
    err.status = 400;
    throw err;
  }
  if (!password || String(password).length < 6) {
    const err = new Error('password deve ter no mínimo 6 caracteres');
    err.status = 400;
    throw err;
  }
  if (!full_name || String(full_name).trim().length < 2) {
    const err = new Error('full_name é obrigatório');
    err.status = 400;
    throw err;
  }
  const existing = await findUserByEmail(db, email);
  if (existing) {
    const err = new Error('E-mail já cadastrado');
    err.status = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const safeRole = role === 'administrador' ? 'administrador' : 'investidor';
  const result = await db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES (?, ?, ?, ?)
  `).bind(String(email).toLowerCase(), passwordHash, String(full_name).trim(), safeRole).run();

  return findUserById(db, result.meta.last_row_id);
}

export { publicUser, hashPassword, verifyPassword };
