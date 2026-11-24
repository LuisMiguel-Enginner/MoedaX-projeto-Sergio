const { AppError } = require('../exceptions/AppError');
const alertRepository = require('../repositories/alertRepository');
const assetRepository = require('../repositories/assetRepository');

const VALID_CONDITIONS = ['above', 'below'];

function validatePayload(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.asset_id !== undefined) {
    if (!Number.isInteger(Number(data.asset_id)) || Number(data.asset_id) <= 0) {
      errors.push('asset_id inválido');
    }
  }
  if (!partial || data.target_price !== undefined) {
    if (!(Number(data.target_price) > 0)) {
      errors.push('target_price deve ser maior que zero');
    }
  }
  if (!partial || data.condition !== undefined) {
    if (!VALID_CONDITIONS.includes(data.condition)) {
      errors.push('condition deve ser above ou below');
    }
  }

  if (errors.length) throw new AppError(400, 'Dados de alerta inválidos', errors);
}

function assertOwnership(alert, user) {
  if (user.role !== 'administrador' && alert.user_id !== user.id) {
    throw new AppError(403, 'Você só pode gerenciar os próprios alertas');
  }
}

function listAlerts(user) {
  if (user.role === 'administrador') return alertRepository.findAll();
  return alertRepository.findByUserId(user.id);
}

function getAlert(id, user) {
  const alert = alertRepository.findById(Number(id));
  if (!alert) throw new AppError(404, 'Alerta não encontrado');
  assertOwnership(alert, user);
  return alert;
}

function createAlert(data, user) {
  validatePayload(data);

  const asset = assetRepository.findById(Number(data.asset_id));
  if (!asset) throw new AppError(404, 'Ativo não encontrado');
  if (!asset.active) {
    throw new AppError(409, 'Não é possível criar alerta para ativo inativo');
  }

  const ownerId = user.role === 'administrador' && data.user_id
    ? Number(data.user_id)
    : user.id;

  const duplicate = alertRepository.findDuplicate({
    user_id: ownerId,
    asset_id: Number(data.asset_id),
    target_price: Number(data.target_price),
    condition: data.condition
  });
  if (duplicate) {
    throw new AppError(409, 'Já existe um alerta ativo idêntico para este ativo');
  }

  return alertRepository.create({
    user_id: ownerId,
    asset_id: Number(data.asset_id),
    target_price: Number(data.target_price),
    condition: data.condition,
    active: data.active === undefined ? 1 : data.active
  });
}

function updateAlert(id, data, user) {
  validatePayload(data, { partial: true });
  const current = alertRepository.findById(Number(id));
  if (!current) throw new AppError(404, 'Alerta não encontrado');
  assertOwnership(current, user);

  if (data.asset_id !== undefined) {
    const asset = assetRepository.findById(Number(data.asset_id));
    if (!asset) throw new AppError(404, 'Ativo não encontrado');
    if (!asset.active) {
      throw new AppError(409, 'Não é possível vincular alerta a ativo inativo');
    }
  }

  return alertRepository.update(Number(id), {
    asset_id: data.asset_id !== undefined ? Number(data.asset_id) : undefined,
    target_price: data.target_price !== undefined ? Number(data.target_price) : undefined,
    condition: data.condition,
    active: data.active
  });
}

function deleteAlert(id, user) {
  const current = alertRepository.findById(Number(id));
  if (!current) throw new AppError(404, 'Alerta não encontrado');
  assertOwnership(current, user);
  alertRepository.remove(Number(id));
  return { deleted: true, id: Number(id) };
}

module.exports = {
  listAlerts,
  getAlert,
  createAlert,
  updateAlert,
  deleteAlert
};
