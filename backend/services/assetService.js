const { AppError } = require('../exceptions/AppError');
const assetRepository = require('../repositories/assetRepository');

const VALID_TYPES = ['crypto', 'fiat'];

function validatePayload(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.symbol !== undefined) {
    if (!data.symbol || !/^[A-Za-z0-9]{2,10}$/.test(String(data.symbol))) {
      errors.push('symbol deve ter 2 a 10 caracteres alfanuméricos');
    }
  }
  if (!partial || data.name !== undefined) {
    if (!data.name || String(data.name).trim().length < 2) {
      errors.push('name é obrigatório');
    }
  }
  if (!partial || data.type !== undefined) {
    if (!VALID_TYPES.includes(data.type)) {
      errors.push('type deve ser crypto ou fiat');
    }
  }

  if (errors.length) throw new AppError(400, 'Dados de ativo inválidos', errors);
}

function listAssets({ activeOnly = false } = {}) {
  return assetRepository.findAll({ activeOnly });
}

function getAsset(id) {
  const asset = assetRepository.findById(Number(id));
  if (!asset) throw new AppError(404, 'Ativo não encontrado');
  return asset;
}

function createAsset(data) {
  validatePayload(data);
  if (assetRepository.findBySymbol(data.symbol)) {
    throw new AppError(409, 'Símbolo de ativo já cadastrado');
  }

  return assetRepository.create({
    symbol: data.symbol,
    name: String(data.name).trim(),
    type: data.type,
    icon: data.icon || null,
    color: data.color || null,
    active: data.active === undefined ? 1 : data.active
  });
}

function updateAsset(id, data) {
  validatePayload(data, { partial: true });
  const current = assetRepository.findById(Number(id));
  if (!current) throw new AppError(404, 'Ativo não encontrado');

  if (data.symbol && String(data.symbol).toUpperCase() !== current.symbol) {
    if (assetRepository.findBySymbol(data.symbol)) {
      throw new AppError(409, 'Símbolo de ativo já cadastrado');
    }
  }

  return assetRepository.update(Number(id), {
    ...data,
    name: data.name !== undefined ? String(data.name).trim() : undefined
  });
}

function deleteAsset(id) {
  const asset = assetRepository.findById(Number(id));
  if (!asset) throw new AppError(404, 'Ativo não encontrado');
  assetRepository.remove(Number(id));
  return { deleted: true, id: Number(id) };
}

module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset
};
