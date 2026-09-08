# tally

tally is a small JSON API: log an expense, say who paid and who it was for, and ask it who owes whom. The interesting part isn't the HTTP; it's that the balance calculation is a pure function you can test with a literal array and no database in sight.

## Tech Stack

- **Language & Runtime:** TypeScript / Bun
- **Database:** sqlite (bun:sqlite)

## API Reference

### Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/expenses` | Log an expense | No |
| `GET` | `/api/v1/expenses` | Fetch all expenses | No |
| `GET` | `/api/v1/balances` | Fetch who owes what | No |
| `GET` | `/api/v1/health` | Fetch api server health | No |

#### Example Request

`POST /api/v1/balances`

```json
{
  "balances": [
    { "person": "prince", "netPence": 2800 },
    { "person": "ash", "netPence": -1400 },
    { "person": "kit", "netPence": -1400 }
  ]
}
