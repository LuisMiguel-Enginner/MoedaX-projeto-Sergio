# MoedaX - Documentação da API REST

## 1. Visão geral

O projeto disponibiliza atualmente um backend HTTP em Node.js e uma interface web em HTML/JavaScript e Angular.

Esta documentação descreve as APIs que estão implementadas no código-fonte atual.

- Base URL local: `http://localhost:3000`
- Formato das respostas: JSON
- Execução: `npm start`
- Arquivo do servidor: `backend/server.js`
- Autenticação de usuários: Supabase Auth
- Cotação externa de criptomoedas: CoinGecko
- Cotação externa de moedas: ExchangeRate API
- Histórico externo de criptomoedas: CoinGecko
- Histórico externo de moedas: Frankfurter

## 2. Cotações e ativos

### 2.1 Listar ativos

`GET /api/assets`

Retorna os ativos disponíveis no mercado, o valor atualizado e a variação recente.

Exemplo de resposta:

```json
{
  "success": true,
  "updated_at": "2026-11-23T15:00:00.000Z",
  "assets": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "type": "crypto",
      "price": "R$ 621.480,20",
      "change": "+3,84%",
      "direction": "up",
      "icon": "₿",
      "color": "btc",
      "points": "M0,23 C12,24 20,10 31,17"
    }
  ]
}
```

Os ativos suportados são `BTC`, `ETH`, `USD` e `EUR`.

O servidor tenta consultar APIs externas. Se o serviço estiver indisponível, retorna os dados locais de fallback armazenados em `backend/server.js`.

### 2.2 Consultar histórico

`GET /api/history?symbol={ativo}&period={periodo}`

Parâmetros:

| Parâmetro | Obrigatório | Valores aceitos |
|---|---:|---|
| `symbol` | Sim | `BTC`, `ETH`, `USD`, `EUR` |
| `period` | Não | Qualquer período; o servidor usa `24h` como padrão |

Períodos utilizados pela interface:

| Período | Comportamento |
|---|---|
| `1h` | Última hora |
| `24h` | Últimas 24 horas |
| `3d` | Últimos 3 dias |
| `15d` | Últimos 15 dias |
| `30d` | Últimos 30 dias |

Exemplo:

`GET /api/history?symbol=BTC&period=24h`

Exemplo de resposta:

```json
{
  "success": true,
  "symbol": "BTC",
  "period": "24h",
  "history": [
    {
      "timestamp": 1763910000000,
      "price": 621480.2
    }
  ]
}
```

Resposta de ativo inválido:

`HTTP 400`

```json
{
  "error": "Ativo inválido"
}
```

## 3. Configuração do Supabase

### 3.1 Consultar configuração pública

`GET /api/supabase-config`

Retorna as variáveis públicas necessárias ao frontend.

Exemplo sem configuração:

```json
{
  "url": "",
  "anonKey": "",
  "configured": false
}
```

Exemplo com configuração:

```json
{
  "url": "https://exemplo.supabase.co",
  "anonKey": "chave-publica-anonima",
  "configured": true
}
```

A chave `anonKey` é destinada ao uso público no navegador. Não adicionar a chave de serviço do Supabase ou outras credenciais privadas nesta resposta.

Quando executado pelo Node.js, o servidor também sincroniza a configuração em `frontend/supabase-config.json`, desde que `SUPABASE_URL` e `SUPABASE_ANON_KEY` estejam definidas no arquivo `.env`.

## 4. Arquivos estáticos

O servidor entrega os arquivos da pasta `frontend/` em rotas correspondentes ao caminho solicitado.

Exemplo:

- `GET /login.html`
- `GET /cadastro.html`
- `GET /index.html`
- `GET /mercado.html`
- `GET /alertas.html`
- `GET /historico.html`

Respostas:

- Arquivo existente: `HTTP 200`
- Arquivo inexistente: `HTTP 404`
- Tentativa de sair da pasta pública: `HTTP 403`
- Métodos diferentes de `GET` em arquivos estáticos: `HTTP 405`

Exemplo de erro:

```json
{
  "error": "Arquivo não encontrado"
}
```

## 5. Autenticação

O backend Node.js não implementa login, cadastro ou controle de sessão.

Essas operações são realizadas diretamente pelo navegador por meio do Supabase Auth. Os arquivos envolvidos são:

- `frontend/javascript/supabase-client.js`
- `frontend/javascript/session-user.js`
- `frontend/javascript/auth-guard.js`
- `frontend/javascript/cadastro.js`
- `frontend/javascript/login.js`
- `frontend-angular/src/app/services/auth.service.ts`

O projeto utiliza o endpoint `/api/supabase-config` para obter a URL e a chave pública do Supabase.

## 6. Códigos HTTP observáveis no backend Node.js

| Código | Situação |
|---|---|
| 200 | Requisição processada ou arquivo encontrado |
| 302 | Redirecionamento da raiz para `/login.html` |
| 400 | Ativo inválido em `/api/history` |
| 403 | Tentativa de acessar arquivo fora de `frontend/` |
| 404 | Arquivo estático não encontrado |
| 405 | Método não permitido para arquivo estático |

## 7. Interface Angular

A aplicação Angular utiliza a mesma API Node.js:

- `/api/assets`
- `/api/history?symbol={ativo}&period=24h`
- `/api/supabase-config`

Para executar:

```text
npm start
npm run start:angular
```

O servidor Node deve permanecer em execução na porta 3000. O Angular utiliza a porta 4200 e o proxy configurado em `frontend-angular/proxy.conf.json`.

## 8. Artefato Spring Boot

O projeto contém o artefato `backend-spring/target/moedax-api-1.0.0.jar`, mas não contém o código-fonte Spring, o `pom.xml` ou os arquivos de configuração completos nesse diretório.

Portanto, os endpoints Spring não podem ser considerados confirmados e documentados nesta versão. Antes de publicar uma documentação específica do Spring, recuperar o código-fonte e executar o JAR localmente para validar:

- porta configurada;
- datasource MySQL;
- endpoints e parâmetros;
- autenticação;
- regras de autorização;
- códigos HTTP;
- exemplos de sucesso e erro.

O relatório existente em `backend-spring/target/surefire-reports/` registra nove testes executados sem falhas ou erros. Esse resultado valida o artefato testado no ambiente utilizado pela geração do relatório, mas não substitui a validação atual do backend em execução.

## 9. Executar e validar

1. Na raiz do projeto, execute `npm install`.
2. Configure o arquivo `.env` com `SUPABASE_URL` e `SUPABASE_ANON_KEY`, quando necessário.
3. Execute `npm start`.
4. Valide `http://localhost:3000/api/assets`.
5. Valide `http://localhost:3000/api/history?symbol=BTC&period=24h`.
6. Valide `http://localhost:3000/api/supabase-config`.
7. Abra `http://localhost:3000/login.html`.
