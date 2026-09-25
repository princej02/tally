# tally

tally is a small JSON API: log an expense, say who paid and who it was for, and ask it who owes whom. The interesting part isn't the HTTP; it's that the balance calculation is a pure function you can test with a literal array and no database in sight.

## Tech Stack

- **Language & Runtime:** TypeScript / Bun
- **Web framework:** Hono
- **Validation:** Zod
- **Database:** sqlite (bun:sqlite)

## Getting Started

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev        # starts the server on http://localhost:3000
```

Environment variables (both optional):

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | port the server listens on |
| `DB_PATH` | `tally.sqlite` | path to the sqlite file (created if missing) |

### Running tests

```bash
bun test
```

### Trying the API

`tally.http` at the repo root has a ready-to-run request for every endpoint, including the validation/error cases (duplicate person in a split, negative amounts, malformed JSON, unknown routes). Open it with an editor extension that runs `.http` files (e.g. VS Code's REST Client) and run requests against a locally running server, or copy them into curl.

## API Reference

### Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server health check | No |
| `GET` | `/expenses` | Fetch all expenses | No |
| `POST` | `/expenses` | Log an expense | No |
| `GET` | `/balances` | Fetch who owes what | No |

Validation failures return `400` with a JSON body of `{ "issues": [{ "path": "...", "message": "..." }] }`. Unmatched routes return `404` with `{ "message": "unknown endpoint" }`. Unexpected server errors return `500` with `{ "message": "internal server error" }` — every response, success or failure, is JSON.

#### Example Request

`POST /expenses`

```json
{
  "description": "dinner",
  "amountPence": 2800,
  "paidBy": "prince",
  "splitBetween": ["prince", "ash", "kit"]
}
```

`GET /balances`

```json
{
  "balances": [
    { "person": "ash", "netPence": -934 },
    { "person": "kit", "netPence": -933 },
    { "person": "prince", "netPence": 1867 }
  ]
}
```

## Design Notes

- **Money is an integer.** Amounts are stored and passed around as `amountPence` (an integer), never a float, so there's no floating-point rounding drift in balance math.
- **The domain logic is pure.** `calculateBalances` (`src/core/balance.ts`) takes an array of expenses and returns balances with no I/O — it's fully covered by unit tests without touching sqlite. Splitting an amount that doesn't divide evenly distributes the leftover pence one-by-one across participants sorted alphabetically, so the result is deterministic regardless of input order.
- **Layering keeps HTTP out of the domain.** `core/` (pure logic) → `infra/` (sqlite persistence) → `api/` (Hono routes) each depend only inward. `createRoutes` takes an already-constructed `ExpenseStore` as a parameter rather than reaching for a global or constructing its own dependencies, so routes can be tested against a fake store with no real database.
- **Shutdown is handled.** Both `SIGINT` and `SIGTERM` close the sqlite connection before exit, since a process manager or container runtime sends `SIGTERM`, not `SIGINT`.

## Non-Goals

This is a small, single-purpose demo, not a production ledger. Deliberately out of scope:

- Authentication/authorization — all endpoints are open.
- Multi-currency support — amounts are a single implicit currency.
- Editing or deleting expenses — the API is append-only.
- Concurrent multi-writer scaling — a single sqlite file is assumed.
