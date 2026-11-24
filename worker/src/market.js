const FALLBACK = {
  BTC: { points: 'M0,23 C12,24 20,10 31,17 S50,7 62,14 S79,4 94,2', price: 621480.2, change: 3.84 },
  ETH: { points: 'M0,25 C15,21 19,22 30,14 S48,18 59,10 S76,12 94,3', price: 18942.7, change: 2.19 },
  USD: { points: 'M0,5 C14,7 21,4 32,13 S48,8 60,16 S78,11 94,25', price: 5.2841, change: -0.42 },
  EUR: { points: 'M0,21 C10,17 20,22 30,16 S46,18 60,12 S78,15 94,9', price: 6.1087, change: 0.16 }
};

const cryptoIds = { BTC: 'bitcoin', ETH: 'ethereum' };

function formatBRL(value, decimals = 2) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatPercent(value) {
  const number = Number(value) || 0;
  return `${number >= 0 ? '+' : ''}${number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function buildAsset(asset, price, changePercent) {
  const decimals = asset.type === 'fiat' ? 4 : 2;
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    type: asset.type,
    price: formatBRL(price, decimals),
    change: formatPercent(changePercent),
    direction: Number(changePercent) >= 0 ? 'up' : 'down',
    icon: asset.icon,
    color: asset.color,
    points: (FALLBACK[asset.symbol] || {}).points || 'M0,20 C30,10 60,25 94,12'
  };
}

async function localAssets(db) {
  const assets = await db.prepare('SELECT * FROM assets WHERE active = 1 ORDER BY id').all();
  const rows = assets.results || [];
  const result = [];
  for (const asset of rows) {
    const latest = await db.prepare('SELECT * FROM quotes WHERE asset_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1').bind(asset.id).first();
    const fallback = FALLBACK[asset.symbol] || { price: 1, change: 0 };
    result.push(buildAsset(asset, latest ? latest.price : fallback.price, latest ? latest.change_percent : fallback.change));
  }
  return result;
}

export async function fetchLiveAssets(db) {
  const assets = await db.prepare('SELECT * FROM assets WHERE active = 1 ORDER BY id').all();
  const rows = assets.results || [];
  try {
    const [cryptoResponse, ratesResponse] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true'),
      fetch('https://open.er-api.com/v6/latest/BRL')
    ]);
    if (!cryptoResponse.ok || !ratesResponse.ok) throw new Error('Serviço de cotações indisponível');
    const crypto = await cryptoResponse.json();
    const rates = await ratesResponse.json();
    const liveMap = {
      BTC: { price: crypto.bitcoin.brl, change: crypto.bitcoin.brl_24h_change },
      ETH: { price: crypto.ethereum.brl, change: crypto.ethereum.brl_24h_change },
      USD: { price: 1 / Number(rates.rates.USD), change: 0 },
      EUR: { price: 1 / Number(rates.rates.EUR), change: 0 }
    };

    const liveAssets = [];
    for (const asset of rows) {
      const live = liveMap[asset.symbol];
      if (live) {
        await db.prepare('INSERT INTO quotes (asset_id, price, change_percent) VALUES (?, ?, ?)')
          .bind(asset.id, Number(live.price), Number(live.change) || 0)
          .run();
        liveAssets.push(buildAsset(asset, live.price, live.change || 0));
      } else {
        const latest = await db.prepare('SELECT * FROM quotes WHERE asset_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1').bind(asset.id).first();
        const fallback = FALLBACK[asset.symbol] || { price: 1, change: 0 };
        liveAssets.push(buildAsset(asset, latest ? latest.price : fallback.price, latest ? latest.change_percent : fallback.change));
      }
    }
    return liveAssets;
  } catch {
    return localAssets(db);
  }
}

function fallbackHistory(asset, period, latest) {
  const points = period === '1h' ? 12 : period === '24h' ? 24 : period === '3d' ? 36 : period === '15d' ? 45 : 60;
  const meta = FALLBACK[asset.symbol] || { price: 1, change: 0 };
  const current = latest ? latest.price : meta.price;
  const change = latest ? latest.change_percent : meta.change;
  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    const wave = Math.sin(index * 1.7) * Math.abs(change || 0.4) * 0.12;
    return {
      timestamp: Date.now() - (points - index) * 3_600_000,
      price: current / (1 + (change / 100) * (1 - progress)) * (1 + wave / 100)
    };
  });
}

export async function fetchAssetHistory(db, symbol, period = '24h') {
  const normalized = String(symbol || '').toUpperCase();
  const asset = await db.prepare('SELECT * FROM assets WHERE symbol = ? AND active = 1').bind(normalized).first();
  if (!asset) {
    const err = new Error('Ativo inválido');
    err.status = 400;
    throw err;
  }

  const latest = await db.prepare('SELECT * FROM quotes WHERE asset_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1').bind(asset.id).first();
  const days = { '1h': 1, '24h': 1, '3d': 3, '15d': 15, '30d': 30 }[period] || 7;

  try {
    if (cryptoIds[normalized]) {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cryptoIds[normalized]}/market_chart?vs_currency=brl&days=${days}`
      );
      if (!response.ok) throw new Error('Histórico cripto indisponível');
      const data = await response.json();
      const cutoff = Date.now() - (period === '1h' ? 3_600_000 : period === '24h' ? 86_400_000 : days * 86_400_000);
      return data.prices.filter(([timestamp]) => timestamp >= cutoff).map(([timestamp, price]) => ({ timestamp, price }));
    }

    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    const formatDate = (date) => date.toISOString().slice(0, 10);
    const response = await fetch(
      `https://api.frankfurter.app/${formatDate(start)}..${formatDate(end)}?from=BRL&to=${normalized}`
    );
    if (!response.ok) throw new Error('Histórico cambial indisponível');
    const data = await response.json();
    return Object.entries(data.rates || {}).map(([date, rates]) => ({
      timestamp: new Date(date).getTime(),
      price: 1 / Number(rates[normalized])
    }));
  } catch {
    return fallbackHistory(asset, period, latest);
  }
}
