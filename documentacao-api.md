# MoedaX - Documentação da API REST

## 1. Visão geral

Backend Node.js em camadas com SQLite, CRUD completo, autenticação HTTP Basic e regras de negócio.

- Base URL local: `http://localhost:3000`
- Base URL Vercel: `https://SEU-PROJETO.vercel.app`
- Formato: JSON
- Execução local: `npm start`
- Deploy: `vercel.json` serve `frontend/` + API serverless em `/api/*`
- Banco: SQLite (`backend/db/moedax.db` local; `/tmp/moedax.db` na Vercel)
- Diagrama de dados: `backend/docs/diagrama-dados.md`
- Coleção Postman: `postman/MoedaX.postman_collection.json`

### Arquitetura

```text
routes → middleware (auth/erros) → controllers → services → repositories → SQLite
```

### Autenticação

Endpoints protegidos exigem **HTTP Basic Auth**:

```http
Authorization: Basic base64(email:senha)
```

Usuários seed (criados na primeira execução):

| E-mail | Senha | Perfil |
|---|---|---|
| `admin@moedax.local` | `admin123` | administrador |
| `investidor@moedax.local` | `invest123` | investidor |

- **401**: sem credenciais ou inválidas (`WWW-Authenticate: Basic`)
- **403**: autenticado, mas sem permissão de perfil

## 2. Mercado (público)

### 2.1 Listar cotações ao vivo

`GET /api/assets`

### 2.2 Histórico

`GET /api/history?symbol={ativo}&period={periodo}`

- `symbol` obrigatório (ativos ativos no banco)
- Inválido → `400`

### 2.3 Config Supabase (legado frontend)

`GET /api/supabase-config`

### 2.4 Usuário autenticado

`GET /api/me` (Basic Auth)

## 3. CRUD — Users (admin)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/users` | Listar |
| GET | `/api/users/:id` | Buscar |
| POST | `/api/users` | Criar |
| PUT | `/api/users/:id` | Atualizar |
| DELETE | `/api/users/:id` | Remover |

Body POST:

```json
{
  "email": "novo@moedax.local",
  "password": "senha123",
  "full_name": "Novo Usuário",
  "role": "investidor"
}
```

Regras:

- e-mail duplicado → `409`
- senha com menos de 6 caracteres → `400`
- investidor acessando → `403`
- admin não remove a própria conta → `409`

## 4. CRUD — Catálogo de ativos (persistido)

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/catalog/assets` | autenticado |
| GET | `/api/catalog/assets/:id` | autenticado |
| POST | `/api/catalog/assets` | admin |
| PUT | `/api/catalog/assets/:id` | admin |
| DELETE | `/api/catalog/assets/:id` | admin |

Body POST:

```json
{
  "symbol": "SOL",
  "name": "Solana",
  "type": "crypto",
  "icon": "◎",
  "color": "sol"
}
```

Símbolo duplicado → `409`.

> Nota: `GET /api/assets` continua público e retorna cotações formatadas para o frontend. O CRUD persistido usa `/api/catalog/assets`.

## 5. CRUD — Quotes (cotações)

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/quotes` | autenticado |
| GET | `/api/quotes/:id` | autenticado |
| POST | `/api/quotes` | autenticado |
| PUT | `/api/quotes/:id` | admin |
| DELETE | `/api/quotes/:id` | admin |

Body POST:

```json
{
  "asset_id": 1,
  "price": 630000.5,
  "change_percent": 1.25
}
```

Cotação em ativo inativo → `409`.

## 6. CRUD — Alerts

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/alerts` | autenticado (próprios; admin vê todos) |
| GET | `/api/alerts/:id` | autenticado + dono/admin |
| POST | `/api/alerts` | autenticado |
| PUT | `/api/alerts/:id` | autenticado + dono/admin |
| DELETE | `/api/alerts/:id` | autenticado + dono/admin |

Body POST:

```json
{
  "asset_id": 1,
  "target_price": 650000,
  "condition": "above"
}
```

Regras:

- alerta idêntico ativo → `409`
- ativo inativo → `409`
- acessar alerta de outro usuário → `403`

## 7. CRUD — Watchlist (favoritos)

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/watchlist` | autenticado |
| GET | `/api/watchlist/:id` | autenticado + dono/admin |
| POST | `/api/watchlist` | autenticado |
| PUT | `/api/watchlist/:id` | autenticado + dono/admin |
| DELETE | `/api/watchlist/:id` | autenticado + dono/admin |

Body POST:

```json
{
  "asset_id": 3,
  "notes": "Observar câmbio"
}
```

Ativo já favoritado pelo usuário → `409`.

## 8. Códigos HTTP

| Código | Situação |
|---|---|
| 200 | Sucesso |
| 201 | Criado |
| 204 | OPTIONS/CORS |
| 302 | Redirect de páginas estáticas |
| 400 | Validação de entrada |
| 401 | Sem autenticação / credenciais inválidas |
| 403 | Sem permissão de perfil ou ownership |
| 404 | Recurso ou endpoint inexistente |
| 405 | Método HTTP não permitido |
| 409 | Conflito de negócio/unicidade |
| 500 | Erro interno |

## 9. Modelo de dados (5 entidades)

1. `users`
2. `assets`
3. `quotes`
4. `alerts`
5. `watchlist_items`

Relacionamentos e diagrama: ver `backend/docs/diagrama-dados.md`.

Schema SQL: `backend/db/schema.sql`.

## 10. Postman

1. Abra o Postman.
2. Import → `postman/MoedaX.postman_collection.json`.
3. Execute `npm start`.
4. Rode as pastas na ordem: Mercado → Autenticação → CRUDs.
5. Ajuste variáveis `assetId`, `alertId`, etc. conforme IDs retornados.

## 11. Interface Angular / frontend legado

O frontend continua usando:

- `GET /api/assets`
- `GET /api/history`
- `GET /api/supabase-config`

Essas rotas permanecem públicas para não quebrar o dashboard.
