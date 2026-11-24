const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function defaultData() {
  return {
    users: [],
    assets: [],
    quotes: [],
    alerts: [],
    watchlist_items: [],
    sequences: { users: 1, assets: 1, quotes: 1, alerts: 1, watchlist_items: 1 }
  };
}

function resolvePath() {
  if (process.env.DB_PATH) return process.env.DB_PATH.replace(/\.db$/i, '.json');
  if (process.env.VERCEL) return path.join(os.tmpdir(), 'moedax.json');
  return path.join(__dirname, 'moedax.json');
}

class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = defaultData();
    this.#load();
  }

  #load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = { ...defaultData(), ...JSON.parse(fs.readFileSync(this.filePath, 'utf8')) };
      }
    } catch {
      this.data = defaultData();
    }
  }

  #save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data), 'utf8');
  }

  pragma() {
    return this;
  }

  exec() {
    return this;
  }

  transaction(fn) {
    const database = this;
    return (...args) => fn.apply(database, args);
  }

  prepare(sql) {
    const database = this;
    const normalized = String(sql).replace(/\s+/g, ' ').trim();

    return {
      all(...params) {
        return database.#all(normalized, params);
      },
      get(...params) {
        const rows = database.#all(normalized, params);
        return rows[0];
      },
      run(...params) {
        return database.#run(normalized, params);
      }
    };
  }

  #nextId(table) {
    const id = this.data.sequences[table] || 1;
    this.data.sequences[table] = id + 1;
    return id;
  }

  #all(sql, params) {
    const lower = sql.toLowerCase();

    if (lower.includes('count(*) as total from users')) {
      return [{ total: this.data.users.length }];
    }

    if (lower.startsWith('select id, email, full_name, role, created_at, updated_at from users')) {
      if (lower.includes('where id =')) {
        const user = this.data.users.find((item) => item.id === Number(params[0]));
        return user ? [publicUser(user)] : [];
      }
      return this.data.users.map(publicUser);
    }

    if (lower.includes('from users where email =')) {
      const user = this.data.users.find((item) => item.email === String(params[0]).toLowerCase());
      return user ? [user] : [];
    }

    if (lower.includes('from users where id =')) {
      const user = this.data.users.find((item) => item.id === Number(params[0]));
      return user ? [user] : [];
    }

    if (lower.includes('from assets')) {
      let rows = [...this.data.assets];
      if (lower.includes('where active = 1')) rows = rows.filter((item) => item.active === 1);
      if (lower.includes('where id =')) rows = rows.filter((item) => item.id === Number(params[0]));
      if (lower.includes('where symbol =')) {
        rows = rows.filter((item) => item.symbol === String(params[0]).toUpperCase());
      }
      return rows.map((item) => ({ ...item }));
    }

    if (lower.includes('from quotes')) {
      let rows = this.data.quotes.map((quote) => {
        const asset = this.data.assets.find((item) => item.id === quote.asset_id) || {};
        return {
          ...quote,
          asset_symbol: asset.symbol,
          asset_name: asset.name
        };
      });
      if (lower.includes('where q.id =') || lower.includes('where id =')) {
        rows = rows.filter((item) => item.id === Number(params[0]));
      }
      if (lower.includes('where q.asset_id =') || lower.includes('where asset_id =')) {
        rows = rows.filter((item) => item.asset_id === Number(params[0]));
      }
      rows.sort((a, b) => String(b.recorded_at).localeCompare(String(a.recorded_at)) || b.id - a.id);
      return rows;
    }

    if (lower.includes('from alerts')) {
      let rows = this.data.alerts.map((alert) => enrichAlert(alert, this.data));
      if (lower.includes('where al.id =') || (lower.includes('where id =') && !lower.includes('user_id'))) {
        rows = rows.filter((item) => item.id === Number(params[0]));
      }
      if (lower.includes('where al.user_id =') || lower.includes('where user_id = ?')) {
        rows = rows.filter((item) => item.user_id === Number(params[0]));
      }
      if (lower.includes('target_price = ?') && lower.includes('condition = ?')) {
        rows = this.data.alerts.filter((item) => (
          item.user_id === Number(params[0])
          && item.asset_id === Number(params[1])
          && Number(item.target_price) === Number(params[2])
          && item.condition === params[3]
          && item.active === 1
        )).map((item) => enrichAlert(item, this.data));
      }
      rows.sort((a, b) => b.id - a.id);
      return rows;
    }

    if (lower.includes('from watchlist_items')) {
      let rows = this.data.watchlist_items.map((item) => enrichWatch(item, this.data));
      if (lower.includes('where w.id =') || (lower.includes('where id =') && !lower.includes('user_id'))) {
        rows = rows.filter((item) => item.id === Number(params[0]));
      }
      if (lower.includes('where w.user_id =') || lower.includes('where user_id = ? and asset_id = ?')) {
        if (lower.includes('asset_id = ?')) {
          rows = this.data.watchlist_items
            .filter((item) => item.user_id === Number(params[0]) && item.asset_id === Number(params[1]))
            .map((item) => enrichWatch(item, this.data));
        } else {
          rows = rows.filter((item) => item.user_id === Number(params[0]));
        }
      }
      rows.sort((a, b) => b.id - a.id);
      return rows;
    }

    return [];
  }

  #run(sql, params) {
    const lower = sql.toLowerCase();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (lower.startsWith('insert into users')) {
      const values = namedOrPositional(params, ['email', 'password_hash', 'full_name', 'role']);
      const id = this.#nextId('users');
      this.data.users.push({
        id,
        email: String(values.email).toLowerCase(),
        password_hash: values.password_hash,
        full_name: values.full_name,
        role: values.role || 'investidor',
        created_at: now,
        updated_at: now
      });
      this.#save();
      return { lastInsertRowid: id, changes: 1 };
    }

    if (lower.startsWith('update users')) {
      const user = this.data.users.find((item) => item.id === Number(params[4] ?? params.at(-1)));
      if (!user) return { changes: 0 };
      user.email = String(params[0]).toLowerCase();
      user.password_hash = params[1];
      user.full_name = params[2];
      user.role = params[3];
      user.updated_at = now;
      this.#save();
      return { changes: 1 };
    }

    if (lower.startsWith('delete from users')) {
      const before = this.data.users.length;
      this.data.users = this.data.users.filter((item) => item.id !== Number(params[0]));
      this.data.alerts = this.data.alerts.filter((item) => item.user_id !== Number(params[0]));
      this.data.watchlist_items = this.data.watchlist_items.filter((item) => item.user_id !== Number(params[0]));
      this.#save();
      return { changes: before === this.data.users.length ? 0 : 1 };
    }

    if (lower.startsWith('insert into assets')) {
      const values = namedOrPositional(params, ['symbol', 'name', 'type', 'icon', 'color', 'active']);
      const id = this.#nextId('assets');
      this.data.assets.push({
        id,
        symbol: String(values.symbol).toUpperCase(),
        name: values.name,
        type: values.type,
        icon: values.icon || null,
        color: values.color || null,
        active: values.active === undefined ? 1 : (values.active ? 1 : 0),
        created_at: now,
        updated_at: now
      });
      this.#save();
      return { lastInsertRowid: id, changes: 1 };
    }

    if (lower.startsWith('update assets')) {
      const asset = this.data.assets.find((item) => item.id === Number(params.at(-1)));
      if (!asset) return { changes: 0 };
      asset.symbol = String(params[0]).toUpperCase();
      asset.name = params[1];
      asset.type = params[2];
      asset.icon = params[3];
      asset.color = params[4];
      asset.active = params[5] ? 1 : 0;
      asset.updated_at = now;
      this.#save();
      return { changes: 1 };
    }

    if (lower.startsWith('delete from assets')) {
      const before = this.data.assets.length;
      const id = Number(params[0]);
      this.data.assets = this.data.assets.filter((item) => item.id !== id);
      this.data.quotes = this.data.quotes.filter((item) => item.asset_id !== id);
      this.data.alerts = this.data.alerts.filter((item) => item.asset_id !== id);
      this.data.watchlist_items = this.data.watchlist_items.filter((item) => item.asset_id !== id);
      this.#save();
      return { changes: before === this.data.assets.length ? 0 : 1 };
    }

    if (lower.startsWith('insert into quotes')) {
      const id = this.#nextId('quotes');
      const hasRecorded = lower.includes('recorded_at');
      this.data.quotes.push({
        id,
        asset_id: Number(params[0]),
        price: Number(params[1]),
        change_percent: Number(params[2] || 0),
        recorded_at: hasRecorded ? params[3] : now
      });
      this.#save();
      return { lastInsertRowid: id, changes: 1 };
    }

    if (lower.startsWith('update quotes')) {
      const quote = this.data.quotes.find((item) => item.id === Number(params.at(-1)));
      if (!quote) return { changes: 0 };
      quote.asset_id = Number(params[0]);
      quote.price = Number(params[1]);
      quote.change_percent = Number(params[2]);
      quote.recorded_at = params[3];
      this.#save();
      return { changes: 1 };
    }

    if (lower.startsWith('delete from quotes')) {
      const before = this.data.quotes.length;
      this.data.quotes = this.data.quotes.filter((item) => item.id !== Number(params[0]));
      this.#save();
      return { changes: before === this.data.quotes.length ? 0 : 1 };
    }

    if (lower.startsWith('insert into alerts')) {
      const values = namedOrPositional(params, ['user_id', 'asset_id', 'target_price', 'condition', 'active']);
      const id = this.#nextId('alerts');
      this.data.alerts.push({
        id,
        user_id: Number(values.user_id),
        asset_id: Number(values.asset_id),
        target_price: Number(values.target_price),
        condition: values.condition,
        active: values.active === undefined ? 1 : (values.active ? 1 : 0),
        created_at: now,
        updated_at: now
      });
      this.#save();
      return { lastInsertRowid: id, changes: 1 };
    }

    if (lower.startsWith('update alerts')) {
      const alert = this.data.alerts.find((item) => item.id === Number(params.at(-1)));
      if (!alert) return { changes: 0 };
      alert.asset_id = Number(params[0]);
      alert.target_price = Number(params[1]);
      alert.condition = params[2];
      alert.active = params[3] ? 1 : 0;
      alert.updated_at = now;
      this.#save();
      return { changes: 1 };
    }

    if (lower.startsWith('delete from alerts')) {
      const before = this.data.alerts.length;
      this.data.alerts = this.data.alerts.filter((item) => item.id !== Number(params[0]));
      this.#save();
      return { changes: before === this.data.alerts.length ? 0 : 1 };
    }

    if (lower.startsWith('insert into watchlist_items')) {
      const values = namedOrPositional(params, ['user_id', 'asset_id', 'notes']);
      const exists = this.data.watchlist_items.some(
        (item) => item.user_id === Number(values.user_id) && item.asset_id === Number(values.asset_id)
      );
      if (exists) {
        const error = new Error('UNIQUE constraint failed');
        error.code = 'SQLITE_CONSTRAINT_UNIQUE';
        throw error;
      }
      const id = this.#nextId('watchlist_items');
      this.data.watchlist_items.push({
        id,
        user_id: Number(values.user_id),
        asset_id: Number(values.asset_id),
        notes: values.notes || null,
        created_at: now
      });
      this.#save();
      return { lastInsertRowid: id, changes: 1 };
    }

    if (lower.startsWith('update watchlist_items')) {
      const item = this.data.watchlist_items.find((row) => row.id === Number(params.at(-1)));
      if (!item) return { changes: 0 };
      item.asset_id = Number(params[0]);
      item.notes = params[1];
      this.#save();
      return { changes: 1 };
    }

    if (lower.startsWith('delete from watchlist_items')) {
      const before = this.data.watchlist_items.length;
      this.data.watchlist_items = this.data.watchlist_items.filter((item) => item.id !== Number(params[0]));
      this.#save();
      return { changes: before === this.data.watchlist_items.length ? 0 : 1 };
    }

    return { changes: 0, lastInsertRowid: 0 };
  }

  close() {}
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

function enrichAlert(alert, data) {
  const user = data.users.find((item) => item.id === alert.user_id) || {};
  const asset = data.assets.find((item) => item.id === alert.asset_id) || {};
  return {
    ...alert,
    user_email: user.email,
    asset_symbol: asset.symbol,
    asset_name: asset.name
  };
}

function enrichWatch(item, data) {
  const user = data.users.find((row) => row.id === item.user_id) || {};
  const asset = data.assets.find((row) => row.id === item.asset_id) || {};
  return {
    ...item,
    user_email: user.email,
    asset_symbol: asset.symbol,
    asset_name: asset.name
  };
}

function namedOrPositional(params, keys) {
  if (params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0])) {
    return params[0];
  }
  const values = {};
  keys.forEach((key, index) => {
    values[key] = params[index];
  });
  return values;
}

function createJsonDatabase() {
  return new JsonDatabase(resolvePath());
}

module.exports = { createJsonDatabase, resolvePath };
