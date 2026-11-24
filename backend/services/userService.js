const { AppError } = require('../exceptions/AppError');
const userRepository = require('../repositories/userRepository');
const { hashPassword } = require('../utils/password');

const VALID_ROLES = ['investidor', 'administrador'];

function validatePayload(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.email !== undefined) {
    if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
      errors.push('email inválido');
    }
  }
  if (!partial || data.password !== undefined) {
    if (!data.password || String(data.password).length < 6) {
      errors.push('password deve ter no mínimo 6 caracteres');
    }
  }
  if (!partial || data.full_name !== undefined) {
    if (!data.full_name || String(data.full_name).trim().length < 2) {
      errors.push('full_name é obrigatório');
    }
  }
  if (data.role !== undefined && !VALID_ROLES.includes(data.role)) {
    errors.push('role deve ser investidor ou administrador');
  }

  if (errors.length) throw new AppError(400, 'Dados de usuário inválidos', errors);
}

async function listUsers() {
  return userRepository.findAll();
}

async function getUser(id) {
  const user = userRepository.findById(Number(id));
  if (!user) throw new AppError(404, 'Usuário não encontrado');
  return user;
}

async function createUser(data) {
  validatePayload(data);
  if (userRepository.findByEmail(data.email)) {
    throw new AppError(409, 'E-mail já cadastrado');
  }

  return userRepository.create({
    email: data.email,
    password_hash: await hashPassword(data.password),
    full_name: String(data.full_name).trim(),
    role: data.role || 'investidor'
  });
}

async function updateUser(id, data) {
  validatePayload(data, { partial: true });
  const current = userRepository.findById(Number(id));
  if (!current) throw new AppError(404, 'Usuário não encontrado');

  if (data.email && data.email.toLowerCase() !== current.email) {
    if (userRepository.findByEmail(data.email)) {
      throw new AppError(409, 'E-mail já cadastrado');
    }
  }

  const payload = {
    email: data.email,
    full_name: data.full_name !== undefined ? String(data.full_name).trim() : undefined,
    role: data.role
  };
  if (data.password) {
    payload.password_hash = await hashPassword(data.password);
  }

  return userRepository.update(Number(id), payload);
}

async function deleteUser(id, actor) {
  const user = userRepository.findById(Number(id));
  if (!user) throw new AppError(404, 'Usuário não encontrado');
  if (actor && actor.id === Number(id)) {
    throw new AppError(409, 'Administrador não pode remover a própria conta');
  }
  userRepository.remove(Number(id));
  return { deleted: true, id: Number(id) };
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
};
