const { AppError } = require('../exceptions/AppError');
const userRepository = require('../repositories/userRepository');
const { verifyPassword } = require('../utils/password');

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return {
      email: decoded.slice(0, separator).trim().toLowerCase(),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

async function authenticate(request) {
  const credentials = parseBasicAuth(request.headers.authorization);
  if (!credentials || !credentials.email || !credentials.password) {
    throw new AppError(401, 'Autenticação HTTP Basic obrigatória');
  }

  const user = userRepository.findByEmail(credentials.email);
  if (!user) {
    throw new AppError(401, 'Credenciais inválidas');
  }

  const valid = await verifyPassword(credentials.password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'Credenciais inválidas');
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role
  };
}

function requireAuth(handler) {
  return async (request, response, context = {}) => {
    const user = await authenticate(request);
    return handler(request, response, { ...context, user });
  };
}

function requireAdmin(handler) {
  return requireAuth(async (request, response, context) => {
    if (context.user.role !== 'administrador') {
      throw new AppError(403, 'Acesso restrito a administradores');
    }
    return handler(request, response, context);
  });
}

function requireRole(...roles) {
  return (handler) => requireAuth(async (request, response, context) => {
    if (!roles.includes(context.user.role)) {
      throw new AppError(403, 'Perfil sem permissão para esta operação');
    }
    return handler(request, response, context);
  });
}

module.exports = {
  authenticate,
  requireAuth,
  requireAdmin,
  requireRole
};
