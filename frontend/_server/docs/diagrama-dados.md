# Diagrama de dados — MoedaX

Banco: SQLite (`backend/db/moedax.db`)

## Entidades (5)

| Entidade | Descrição |
|---|---|
| `users` | Usuários da API (HTTP Basic) com perfil `investidor` ou `administrador` |
| `assets` | Ativos de mercado (crypto/fiat) |
| `quotes` | Cotações históricas vinculadas a um ativo |
| `alerts` | Alertas de preço por usuário e ativo |
| `watchlist_items` | Favoritos (lista de acompanhamento) |

## Relacionamentos

- `users` 1:N `alerts`
- `users` 1:N `watchlist_items`
- `assets` 1:N `quotes`
- `assets` 1:N `alerts`
- `assets` 1:N `watchlist_items`
- `watchlist_items` UNIQUE (`user_id`, `asset_id`)

## Diagrama ER

```mermaid
erDiagram
  users ||--o{ alerts : possui
  users ||--o{ watchlist_items : possui
  assets ||--o{ quotes : tem
  assets ||--o{ alerts : dispara
  assets ||--o{ watchlist_items : favoritado

  users {
    int id PK
    text email UK
    text password_hash
    text full_name
    text role
    text created_at
    text updated_at
  }

  assets {
    int id PK
    text symbol UK
    text name
    text type
    text icon
    text color
    int active
    text created_at
    text updated_at
  }

  quotes {
    int id PK
    int asset_id FK
    real price
    real change_percent
    text recorded_at
  }

  alerts {
    int id PK
    int user_id FK
    int asset_id FK
    real target_price
    text condition
    int active
    text created_at
    text updated_at
  }

  watchlist_items {
    int id PK
    int user_id FK
    int asset_id FK
    text notes
    text created_at
  }
```

## Arquitetura em camadas

```text
HTTP Request
    → routes/            (roteamento)
    → middleware/        (auth + erros)
    → controllers/       (entrada/saída HTTP)
    → services/          (regras de negócio)
    → repositories/      (acesso a dados SQLite)
    → db/moedax.db
```
