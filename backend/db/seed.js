const { getDb } = require('../config/database');
const { hashPassword } = require('../utils/password');

const seedAssets = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', icon: '₿', color: 'btc' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', icon: '◆', color: 'eth' },
  { symbol: 'USD', name: 'Dólar americano', type: 'fiat', icon: '$', color: 'usd' },
  { symbol: 'EUR', name: 'Euro', type: 'fiat', icon: '€', color: 'eur' }
];

const seedQuotes = {
  BTC: { price: 621480.2, change_percent: 3.84 },
  ETH: { price: 18942.7, change_percent: 2.19 },
  USD: { price: 5.2841, change_percent: -0.42 },
  EUR: { price: 6.1087, change_percent: 0.16 }
};

async function seedDatabase() {
  const db = getDb();
  const userCount = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
  if (userCount > 0) return { seeded: false };

  const adminHash = await hashPassword('admin123');
  const investorHash = await hashPassword('invest123');

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES (@email, @password_hash, @full_name, @role)
  `);
  const insertAsset = db.prepare(`
    INSERT INTO assets (symbol, name, type, icon, color, active)
    VALUES (@symbol, @name, @type, @icon, @color, 1)
  `);
  const insertQuote = db.prepare(`
    INSERT INTO quotes (asset_id, price, change_percent)
    VALUES (@asset_id, @price, @change_percent)
  `);
  const insertAlert = db.prepare(`
    INSERT INTO alerts (user_id, asset_id, target_price, condition, active)
    VALUES (@user_id, @asset_id, @target_price, @condition, 1)
  `);
  const insertWatch = db.prepare(`
    INSERT INTO watchlist_items (user_id, asset_id, notes)
    VALUES (@user_id, @asset_id, @notes)
  `);

  const tx = db.transaction(() => {
    const admin = insertUser.run({
      email: 'admin@moedax.local',
      password_hash: adminHash,
      full_name: 'Administrador MoedaX',
      role: 'administrador'
    });
    const investor = insertUser.run({
      email: 'investidor@moedax.local',
      password_hash: investorHash,
      full_name: 'Investidor Demo',
      role: 'investidor'
    });

    const assetIds = {};
    for (const asset of seedAssets) {
      const result = insertAsset.run(asset);
      assetIds[asset.symbol] = Number(result.lastInsertRowid);
      const quote = seedQuotes[asset.symbol];
      insertQuote.run({
        asset_id: assetIds[asset.symbol],
        price: quote.price,
        change_percent: quote.change_percent
      });
    }

    insertAlert.run({
      user_id: Number(investor.lastInsertRowid),
      asset_id: assetIds.BTC,
      target_price: 650000,
      condition: 'above'
    });
    insertWatch.run({
      user_id: Number(investor.lastInsertRowid),
      asset_id: assetIds.BTC,
      notes: 'Acompanhar volatilidade'
    });
    insertWatch.run({
      user_id: Number(admin.lastInsertRowid),
      asset_id: assetIds.ETH,
      notes: 'Monitoramento institucional'
    });
  });

  tx();
  return { seeded: true };
}

module.exports = { seedDatabase };
