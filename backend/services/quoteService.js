const { AppError } = require('../exceptions/AppError');
const assetRepository = require('../repositories/assetRepository');
const quoteRepository = require('../repositories/quoteRepository');

function validatePayload(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.asset_id !== undefined) {
    if (!Number.isInteger(Number(data.asset_id)) || Number(data.asset_id) <= 0) {
      errors.push('asset_id inválido');
    }
  }
  if (!partial || data.price !== undefined) {
    if (!(Number(data.price) > 0)) {
      errors.push('price deve ser maior que zero');
    }
  }
  if (data.change_percent !== undefined && Number.isNaN(Number(data.change_percent))) {
    errors.push('change_percent inválido');
  }

  if (errors.length) throw new AppError(400, 'Dados de cotação inválidos', errors);
}

function listQuotes(assetId) {
  if (assetId) return quoteRepository.findByAssetId(Number(assetId));
  return quoteRepository.findAll();
}

function getQuote(id) {
  const quote = quoteRepository.findById(Number(id));
  if (!quote) throw new AppError(404, 'Cotação não encontrada');
  return quote;
}

function createQuote(data) {
  validatePayload(data);
  const asset = assetRepository.findById(Number(data.asset_id));
  if (!asset) throw new AppError(404, 'Ativo não encontrado');
  if (!asset.active) {
    throw new AppError(409, 'Não é possível registrar cotação para ativo inativo');
  }

  return quoteRepository.create({
    asset_id: Number(data.asset_id),
    price: Number(data.price),
    change_percent: data.change_percent !== undefined ? Number(data.change_percent) : 0,
    recorded_at: data.recorded_at || null
  });
}

function updateQuote(id, data) {
  validatePayload(data, { partial: true });
  const current = quoteRepository.findById(Number(id));
  if (!current) throw new AppError(404, 'Cotação não encontrada');

  if (data.asset_id !== undefined) {
    const asset = assetRepository.findById(Number(data.asset_id));
    if (!asset) throw new AppError(404, 'Ativo não encontrado');
  }

  return quoteRepository.update(Number(id), {
    asset_id: data.asset_id !== undefined ? Number(data.asset_id) : undefined,
    price: data.price !== undefined ? Number(data.price) : undefined,
    change_percent: data.change_percent !== undefined ? Number(data.change_percent) : undefined,
    recorded_at: data.recorded_at
  });
}

function deleteQuote(id) {
  const quote = quoteRepository.findById(Number(id));
  if (!quote) throw new AppError(404, 'Cotação não encontrada');
  quoteRepository.remove(Number(id));
  return { deleted: true, id: Number(id) };
}

module.exports = {
  listQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote
};
