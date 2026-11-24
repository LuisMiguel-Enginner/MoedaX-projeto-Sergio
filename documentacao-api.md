# MoedaX - Documentação da API REST

## 1. Visão geral

- **Produção (Cloudflare Workers + D1):** https://moedax.luismiguelgomesoliveira-014.workers.dev
- **Local (Node opcional):** `http://localhost:3000` via `npm start`
- Formato: JSON
- Banco produção: Cloudflare D1 `moedax`
- Diagrama: `backend/docs/diagrama-dados.md`
- Postman: `postman/MoedaX.postman_collection.json`

## 2. Autenticação do site

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
Authorization: Bearer <jwt>
```

### Login

`POST /api/auth/login`

```json
{ "email": "investidor@moedax.local", "password": "invest123" }
```

### Cadastro

`POST /api/auth/register`

```json
{
  "email": "novo@moedax.local",
  "password": "senha123",
  "full_name": "Novo Usuário",
  "role": "investidor"
}
```

## 3. Mercado (público)

- `GET /api/assets`
- `GET /api/history?symbol=BTC&period=24h`
- `GET /api/health`

## 4. CRUD (HTTP Basic ou Bearer)

Usuários seed:

| E-mail | Senha | Perfil |
|---|---|---|
| `admin@moedax.local` | `admin123` | administrador |
| `investidor@moedax.local` | `invest123` | investidor |

```http
Authorization: Basic base64(email:senha)
```

| Recurso | Rotas |
|---|---|
| Users | `/api/users` (admin) |
| Assets | `/api/catalog/assets` |
| Quotes | `/api/quotes` |
| Alerts | `/api/alerts` |
| Watchlist | `/api/watchlist` |

Métodos: GET, POST, PUT, DELETE.

## 5. Códigos HTTP

| Código | Situação |
|---|---|
| 200/201 | Sucesso |
| 400 | Validação |
| 401 | Sem auth / inválida |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 409 | Conflito (duplicidade) |
| 500 | Erro interno |

## 6. Modelo de dados

5 entidades: `users`, `assets`, `quotes`, `alerts`, `watchlist_items`  
Schema: `migrations/0001_init.sql`
