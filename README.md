# MoedaX

Plataforma de comparação e monitoramento de moedas e criptomoedas.

## Integrantes

- Luiz Felipe Kremer Dias - RA 272756
- Eduardo Campovila Romano - RA 272804
- Gustavo Henrique Da Silva Dos Reis - RA 272597
- Kayke Macedo Rodrigues - RA 273350
- Luis Miguel Gomes Oliveira - RA 272530

## Estrutura

- `frontend/` — HTML, CSS e JavaScript (dashboard, login e cadastro).
- `frontend-angular/` — interface Angular com Material.
- `backend/` — API Node.js em camadas (controllers, services, repositories) + SQLite.
- `backend/docs/diagrama-dados.md` — diagrama ER das 5 entidades.
- `postman/MoedaX.postman_collection.json` — coleção de testes da API.
- `supabase/` — SQL legado de perfis (Auth Supabase no frontend).
- `documentacao-api.md` — documentação completa dos endpoints.

## Backend (requisitos da prova)

| Requisito | Como foi atendido |
|---|---|
| Modelagem e consultas | SQLite com 5 entidades relacionadas (`users`, `assets`, `quotes`, `alerts`, `watchlist_items`) + diagrama |
| CRUD | POST/PUT/DELETE em todas as entidades |
| Camadas e regras de negócio | `routes` → `middleware` → `controllers` → `services` → `repositories` |
| Validação e exceções | `AppError` centralizado; códigos 400/401/403/404/405/409 |
| Autenticação/autorização | HTTP Basic Auth + perfis `administrador` / `investidor` |
| Testes Postman | Coleção em `postman/` |

### Credenciais demo (seed automático)

| E-mail | Senha | Perfil |
|---|---|---|
| `admin@moedax.local` | `admin123` | administrador |
| `investidor@moedax.local` | `invest123` | investidor |

## Deploy na Vercel (avaliação sem rodar local)

O projeto está preparado para a Vercel servir o `frontend/` e a API (`/api/*`) juntos.

### Configuração obrigatória na Vercel

1. **Settings → General → Root Directory**: use `frontend` (recomendado para este projeto) **ou** deixe vazio (raiz do repositório).
2. **Settings → Environment Variables** (recomendado):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. No Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://moeda-x.vercel.app` (ou a URL do seu deploy)
   - Redirect URLs: `https://moeda-x.vercel.app/**`
4. Confirme que o projeto Supabase está **ativo** (não pausado). Se o console mostrar `ERR_NAME_NOT_RESOLVED`, o projeto Supabase foi removido ou pausado — restaure ou crie outro e atualize `frontend/supabase-config.json`.

Telas no deploy:

- Login: `/login.html`
- Cadastro: `/cadastro.html`
- Dashboard: `/` ou `/index.html`
- Mercado / Alertas / Histórico: `/mercado.html`, `/alertas.html`, `/historico.html`

Sem sessão válida, o dashboard redireciona para o login. A API responde em `/api/...`.

## Executar localmente

1. Instale o Node.js 20.
2. Na raiz do projeto: `npm install`
3. (Opcional) Copie `.env.example` para `.env` e preencha Supabase.
4. Execute `npm start`
5. Abra `http://localhost:3000/login.html`
6. Importe a coleção Postman e teste a API autenticada.

Na primeira execução o banco `backend/db/moedax.db` é criado e populado automaticamente.

## Aplicação Angular

A aplicação Angular está em `frontend-angular/`. Dashboard, login e cadastro usam NgModules e Angular Material.

Para executar a interface Angular com as APIs:

1. Terminal 1: `npm start` (backend na porta 3000).
2. Terminal 2: `npm run start:angular` (Angular na porta 4200).
3. Abra `http://localhost:4200/`.

O dashboard abre em modo demonstrativo. Rotas de mercado usam as APIs públicas `/api/assets` e `/api/history`.

## Configurar Supabase (opcional / frontend legado)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie URL e anon key para o `.env`.
3. No **SQL Editor**, execute `supabase/schema.sql` se for usar Auth no frontend.

A autenticação da **API Node.js** é independente (HTTP Basic + tabela `users` no SQLite).
