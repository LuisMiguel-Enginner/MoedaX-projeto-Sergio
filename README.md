# MoedaX

Plataforma de comparação e monitoramento de moedas e criptomoedas.

## Integrantes

- Luiz Felipe Kremer Dias - RA 272756
- Eduardo Campovila Romano - RA 272804
- Gustavo Henrique Da Silva Dos Reis - RA 272597
- Kayke Macedo Rodrigues - RA 273350
- Luis Miguel Gomes Oliveira - RA 272530

## Stack atual

- **Frontend**: HTML/CSS/JS em `frontend/`
- **API + Auth**: Cloudflare Workers (`worker/`)
- **Banco**: Cloudflare D1 (`moedax`)
- **Backend Node local** (opcional/prova): `backend/` + SQLite + Postman

## Deploy Cloudflare (avaliação online)

1. Instale dependências: `npm install`
2. Login: `npm run cf:login`
3. Aplique as migrations no D1 remoto:
   ```bash
   npm run cf:migrate
   ```
4. Publique:
   ```bash
   npm run cf:deploy
   ```
5. Abra a URL do Worker.

**Deploy atual:** https://moedax.luismiguelgomesoliveira-014.workers.dev

### Contas demo (seed automático)

| E-mail | Senha | Perfil |
|---|---|---|
| `admin@moedax.local` | `admin123` | administrador |
| `investidor@moedax.local` | `invest123` | investidor |

### Telas

- Login: `/login.html`
- Cadastro: `/cadastro.html`
- Entrada do sistema: `/` ou `/login.html` (redireciona para login)
- Dashboard: `/index.html` (exige autenticação)
- Mercado / Alertas / Histórico

Autenticação do site usa `POST /api/auth/login` e `POST /api/auth/register` (JWT).  
CRUD da prova também aceita **HTTP Basic Auth**.

## Executar localmente (Cloudflare)

```bash
npm run cf:dev
```

## Executar backend Node local (opcional)

```bash
npm start
```

Abre `http://localhost:3000` com SQLite local e a coleção Postman em `postman/`.

## Modelo de dados (5 entidades)

`users`, `assets`, `quotes`, `alerts`, `watchlist_items`  
Diagrama: `backend/docs/diagrama-dados.md`  
Schema D1: `migrations/0001_init.sql`
