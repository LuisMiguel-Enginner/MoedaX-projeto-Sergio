import { hashPassword } from './crypto.js';

export async function ensureSeed(db) {
  const row = await db.prepare('SELECT COUNT(*) AS total FROM users').first();
  if (row && Number(row.total) > 0) return { seeded: false };

  const adminHash = await hashPassword('admin123');
  const investorHash = await hashPassword('invest123');

  await db.batch([
    db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).bind('admin@moedax.local', adminHash, 'Administrador MoedaX', 'administrador'),
    db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).bind('investidor@moedax.local', investorHash, 'Investidor Demo', 'investidor'),
    db.prepare(`
      INSERT INTO assets (symbol, name, type, icon, color, active)
      VALUES ('BTC', 'Bitcoin', 'crypto', '₿', 'btc', 1)
    `),
    db.prepare(`
      INSERT INTO assets (symbol, name, type, icon, color, active)
      VALUES ('ETH', 'Ethereum', 'crypto', '◆', 'eth', 1)
    `),
    db.prepare(`
      INSERT INTO assets (symbol, name, type, icon, color, active)
      VALUES ('USD', 'Dólar americano', 'fiat', '$', 'usd', 1)
    `),
    db.prepare(`
      INSERT INTO assets (symbol, name, type, icon, color, active)
      VALUES ('EUR', 'Euro', 'fiat', '€', 'eur', 1)
    `)
  ]);

  const assets = await db.prepare('SELECT id, symbol FROM assets').all();
  const bySymbol = Object.fromEntries((assets.results || []).map((item) => [item.symbol, item.id]));
  const quotes = {
    BTC: [621480.2, 3.84],
    ETH: [18942.7, 2.19],
    USD: [5.2841, -0.42],
    EUR: [6.1087, 0.16]
  };

  const statements = Object.entries(quotes).map(([symbol, [price, change]]) =>
    db.prepare('INSERT INTO quotes (asset_id, price, change_percent) VALUES (?, ?, ?)').bind(bySymbol[symbol], price, change)
  );

  const investor = await db.prepare("SELECT id FROM users WHERE email = 'investidor@moedax.local'").first();
  statements.push(
    db.prepare('INSERT INTO alerts (user_id, asset_id, target_price, condition, active) VALUES (?, ?, ?, ?, 1)')
      .bind(investor.id, bySymbol.BTC, 650000, 'above'),
    db.prepare('INSERT INTO watchlist_items (user_id, asset_id, notes) VALUES (?, ?, ?)')
      .bind(investor.id, bySymbol.BTC, 'Acompanhar volatilidade')
  );

  await db.batch(statements);
  return { seeded: true };
}
