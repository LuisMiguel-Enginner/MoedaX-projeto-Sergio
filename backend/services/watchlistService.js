const { AppError } = require('../exceptions/AppError');
const assetRepository = require('../repositories/assetRepository');
const watchlistRepository = require('../repositories/watchlistRepository');

function validatePayload(data, { partial = false } = {}) {
  const errors = [];
  if (!partial || data.asset_id !== undefined) {
    if (!Number.isInteger(Number(data.asset_id)) || Number(data.asset_id) <= 0) {
      errors.push('asset_id inválido');
    }
  }
  if (errors.length) throw new AppError(400, 'Dados de favorito inválidos', errors);
}

function assertOwnership(item, user) {
  if (user.role !== 'administrador' && item.user_id !== user.id) {
    throw new AppError(403, 'Você só pode gerenciar a própria lista de favoritos');
  }
}

function listWatchlist(user) {
  if (user.role === 'administrador') return watchlistRepository.findAll();
  return watchlistRepository.findByUserId(user.id);
}

function getWatchlistItem(id, user) {
  const item = watchlistRepository.findById(Number(id));
  if (!item) throw new AppError(404, 'Favorito não encontrado');
  assertOwnership(item, user);
  return item;
}

function createWatchlistItem(data, user) {
  validatePayload(data);

  const asset = assetRepository.findById(Number(data.asset_id));
  if (!asset) throw new AppError(404, 'Ativo não encontrado');
  if (!asset.active) {
    throw new AppError(409, 'Não é possível favoritar ativo inativo');
  }

  const ownerId = user.role === 'administrador' && data.user_id
    ? Number(data.user_id)
    : user.id;

  if (watchlistRepository.findByUserAndAsset(ownerId, Number(data.asset_id))) {
    throw new AppError(409, 'Ativo já está na lista de favoritos do usuário');
  }

  return watchlistRepository.create({
    user_id: ownerId,
    asset_id: Number(data.asset_id),
    notes: data.notes || null
  });
}

function updateWatchlistItem(id, data, user) {
  validatePayload(data, { partial: true });
  const current = watchlistRepository.findById(Number(id));
  if (!current) throw new AppError(404, 'Favorito não encontrado');
  assertOwnership(current, user);

  if (data.asset_id !== undefined) {
    const asset = assetRepository.findById(Number(data.asset_id));
    if (!asset) throw new AppError(404, 'Ativo não encontrado');
    if (!asset.active) {
      throw new AppError(409, 'Não é possível favoritar ativo inativo');
    }
    const conflict = watchlistRepository.findByUserAndAsset(current.user_id, Number(data.asset_id));
    if (conflict && conflict.id !== current.id) {
      throw new AppError(409, 'Ativo já está na lista de favoritos do usuário');
    }
  }

  return watchlistRepository.update(Number(id), {
    asset_id: data.asset_id !== undefined ? Number(data.asset_id) : undefined,
    notes: data.notes
  });
}

function deleteWatchlistItem(id, user) {
  const current = watchlistRepository.findById(Number(id));
  if (!current) throw new AppError(404, 'Favorito não encontrado');
  assertOwnership(current, user);
  watchlistRepository.remove(Number(id));
  return { deleted: true, id: Number(id) };
}

module.exports = {
  listWatchlist,
  getWatchlistItem,
  createWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem
};
