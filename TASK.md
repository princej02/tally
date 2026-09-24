# 🎟️ ENG-3247: Tally

**Difficulty:** Level 2 (Fundamentals) | **Language:** TypeScript (Bun + Hono + Zod + bun:sqlite)
**Status:** in progress
**Previous ticket:** ENG-3211 (changelog-chef, Python) ✅ signed off

---

## 💡 Concepts

**SQLite** is a database that is just a file on disk. No server, no daemon, no connection string. You open `tally.db`, run SQL against it, done. `bun:sqlite` ships with the runtime so there is nothing to install.

**Schema validation at the boundary.** HTTP hands you `unknown`. A JSON body could be anything. Zod converts that `unknown` into a typed value or a structured error, once, at the door, so everything downstream works with types it can trust. Same instinct as `parse_line` returning `Commit | ParseProblem` in ENG-3211: convert messy input into a known shape at the edge and keep the mess from leaking inward.

- bun:sqlite: https://bun.sh/docs/api/sqlite
- Hono routing: https://hono.dev/docs/api/routing
- Zod: https://zod.dev/

---

## 📋 Context

Four people share a house. Someone buys loo roll, someone else covers the internet bill, and by the end of the month nobody remembers who owes what.

`tally` is a small JSON API: log an expense, say who paid and who it was for, ask it who owes whom. The interesting part is not the HTTP. It is that the balance calculation is a pure function testable with a literal array and no database in sight.

---

## 🗺️ Architecture

```
HTTP request
    |
    v
api/routes.ts        TRANSPORT: Hono handlers, Zod parsing, status codes
    |
    v
infra/expenses.ts    DATA: SQLite schema, insert, selectAll
    |
    v
core/balance.ts      PURE: Expense[] -> Balance[]
    |
    v
JSON response
```

`core/` imports nothing from `infra/` or `hono`. `balance.ts` never sees a `Request`. `routes.ts` contains no arithmetic.

---

## 🔍 Expected behaviour

### Log an expense

```bash
curl -X POST localhost:3000/expenses \
  -H 'content-type: application/json' \
  -d '{"description":"Broadband","amountPence":4200,"paidBy":"prince","splitBetween":["prince","ash","kit"]}'
```

`201 Created`

```json
{
  "id": 1,
  "description": "Broadband",
  "amountPence": 4200,
  "paidBy": "prince",
  "splitBetween": ["prince", "ash", "kit"],
  "createdAt": "2026-09-06T10:14:22.000Z"
}
```

### Bad input

```bash
curl -X POST localhost:3000/expenses \
  -H 'content-type: application/json' \
  -d '{"description":"","amountPence":-5,"paidBy":"prince","splitBetween":[]}'
```

`400 Bad Request`

```json
{
  "error": "validation_failed",
  "issues": [
    { "path": "description", "message": "must not be empty" },
    { "path": "amountPence", "message": "must be a positive integer" },
    { "path": "splitBetween", "message": "must include at least one person" }
  ]
}
```

All issues reported at once, not just the first.

### Balances

```bash
curl localhost:3000/balances
```

```json
{
  "balances": [
    { "person": "prince", "netPence": 2800 },
    { "person": "ash", "netPence": -1400 },
    { "person": "kit", "netPence": -1400 }
  ]
}
```

Positive means owed money, negative means owes it. Must sum to zero.

---

## 📐 Requirements

1. **Endpoints:** `POST /expenses` (201), `GET /expenses` (200, newest first), `GET /balances` (200), `GET /health` returning `{"status":"ok"}`.
2. **Validation:** `description` non-empty, `amountPence` a positive integer, `paidBy` non-empty, `splitBetween` at least one person. Unknown fields rejected. All issues reported together.
3. **Money is integers.** Store pence, never pounds. `0.1 + 0.2 !== 0.3`, and a bill splitter that loses a penny per transaction is a bill splitter nobody trusts.
4. **Remainders:** £42 across three is 1400 each. £10 across three is 333, 333, 334. Someone takes the extra penny, chosen deterministically, and balances still sum to zero.
5. **Persistence:** SQLite file, table created on first run if absent. Data survives a restart.
6. **404** for unknown routes, as JSON, not an HTML error page.

---

## 🧱 Structure

```
tally/
├── src/
│   ├── index.ts             # bootstrap: open db, mount routes, listen
│   ├── api/
│   │   ├── routes.ts        # TRANSPORT
│   │   └── schemas.ts       # Zod schemas + issue formatting
│   ├── core/
│   │   ├── types.ts         # Expense, Balance
│   │   └── balance.ts       # calculateBalances(Expense[]): Balance[]   PURE
│   └── infra/
│       └── expenses.ts      # DATA
└── tests/
    └── balance.test.ts
```

---

## ✅ Definition of Done

- [ ] All four endpoints behave as specified
- [ ] Invalid body returns 400 with every issue listed
- [ ] Data survives a restart
- [ ] `calculateBalances` tested: single expense, multiple payers, uneven split with remainder, empty input
- [ ] Balances always sum to zero, asserted explicitly in a test
- [ ] `core/` imports nothing from `infra/` or `hono`
- [ ] README with setup, endpoint table, example curls

---

## 🎯 Stretch

`GET /settlements`: turn the balance list into the minimum set of "X pays Y £Z" transfers. Three people is easy. The general case is a genuinely interesting little algorithm.

---

# 📌 Decisions settled in review

Keep these. They are the answers to questions already asked and resolved.

**`splitBetween` is the complete participant list.** The payer counts only if the client put them there. Do not add `paidBy` to the split set inside `calculateBalances`, and do not validate that `paidBy` appears in `splitBetween`. A gift bought for two others is `paidBy: "prince"`, `splitBetween: ["ash","kit"]`, and prince nets the full amount. Document this in the README: `splitBetween` must list everyone sharing the cost, payer included if applicable.

**No roster.** A person exists only because their name appears in some expense. The response covers every name mentioned across all expenses, computed over the whole list, not per expense. Someone who nets exactly 0 is still included; only a name that appears nowhere is absent. A roster of known housemates seeded at zero is a separate feature with its own table, not part of this ticket.

**Two orderings, two jobs.** The sort inside the loop decides who absorbs the remainder penny. The sort at the return decides row order in the response. They are independent: deleting either changes exactly one behaviour.

**Remainder allocation is by person, not by array position.** `["kit","ash","prince"]` and `["ash","kit","prince"]` are the same expense and must produce identical balances. Otherwise the same person's name habitually landing first means they absorb the extra penny on every uneven split forever.

**Empty `splitBetween` is skipped entirely in core**, payer credit included, so sum-to-zero holds. Zod rejects it upstream so this is only reachable via a bug. Note in the README that the core silently skips such rows.

**`path: "body"`** is the sentinel for object level issues (`.strict()` violations), where Zod gives an empty path array. Document it so callers know it is not a field name.

---

# 📊 Progress

## ✅ `core/balance.ts`
Integer arithmetic, `base * shareCount + remainder === amountPence` by construction so pennies cannot leak. `add` helper extracted. Remainder allocated over a sorted copy of `splitBetween`. Output sorted by person.

Open item: `localeCompare` is locale sensitive, consults the runtime ICU data, and can differ between environments with accented or non-ASCII names. Bad property for the function deciding who loses a penny. Either compare with `<` / `>` (plain code unit order, identical everywhere) or hoist a pinned `new Intl.Collator("en")` outside the loop, which also avoids constructing a collator on every comparison.

## 🟡 `tests/balance.test.ts`
Written and mostly good. The two orderings test pins the property rather than the output, which is the right instinct.

Still to add:
- [ ] Sum to zero: reduce `netPence` across the result, assert exactly `0`, over a deliberately awkward amount. This is the check that catches remainder bugs you did not think to write a case for.
- [ ] `calculateBalances([])`, the empty input case. Catches a crash on first boot with an empty database.
- [ ] A remainder greater than 1 (for example 1001 across 3, or 1000 across 7). Every current uneven case has exactly one spare penny, so `i < remainder` and `i < 1` are indistinguishable from the existing tests.
- [ ] Someone netting exactly 0, paying their share and nothing more.
- [ ] Revisit the empty `splitBetween` test: it expects `[]` but the payer is credited before the loop, so check what is actually in the map at the return.

## ✅ `api/schemas.ts`
`z.strictObject` rejects unknown fields. `personSchema` extracted so the name rule cannot drift between `paidBy` and `splitBetween` elements. Single `refine` covering integer and positive in one check, so `-4.5` yields one issue rather than two. Duplicates rejected with a specific message. `formatZodError` maps `ZodError.issues` to `{ path, message }` with `"body"` for empty paths.

Open item: confirm empirically what Zod emits for a `.strict()` violation in your version. If the message does not name the offending key, the caller sees `body: Invalid input` and has to diff their payload against the docs.

Note: nested paths render as `splitBetween.1`. Fine, just part of the public contract now.

## 🔜 `infra/expenses.ts` (next)

Questions to have answers for:

- **The array.** `splitBetween` must survive a round trip through a store with no array type. JSON text in a column, or a second table with a row per participant. Either is defensible. The repo's job is to hide which: `insert` takes an expense shaped thing, `selectAll` returns `Expense[]` with a real `string[]` on it, and nothing outside `infra/` can tell.
- **Table creation.** `CREATE TABLE IF NOT EXISTS` is the tool. The question is who calls it and when. A module doing it as an import side effect is the version that bites later.
- **`createdAt`.** SQLite has no date type. Decide whether the timestamp is generated in TypeScript at insert time or by SQLite via `DEFAULT`, and make sure what comes back out matches the format that went in.
- **Types at the boundary.** The caller does not supply `id` on POST, the database assigns it. The thing going in and the thing coming out are different shapes. Be explicit in the signatures rather than making `id` optional and hoping.
- **Statement lifecycle.** `db.query()` caches prepared statements, `db.prepare()` does not. Preparing the same SQL in a hot path on every call is wasted work.

## 🔜 `api/routes.ts` (stubbed)

`/health` is correct. The rest are placeholders. Decide before filling them in:

- **How handlers reach the database.** Importing a module level `db` welds every route to one real SQLite file: no in memory database for tests, and `index.ts` no longer owns the lifecycle it is supposed to own. A factory (`createRoutes(repo)`) or context variables via `c.set` / `c.get` keep the wiring in `index.ts`.
- **Status codes.** `POST /expenses` needs 201, not the default 200.
- **The 404.** Unmatched routes currently fall through to Hono's plain text default. See `app.notFound()`. Same for unexpected throws, see `app.onError()`: a stack trace rendered as HTML is not an API response.
- **What `routes.ts` is allowed to know.** Take an unknown body, hand it to the schema, either turn issues into a 400 or pass a trusted value to the repo. The moment it reshapes fields or computes anything, the boundary has leaked.
- **`GET /expenses` ordering.** Newest first is an `ORDER BY` in `infra/`, not a `.sort()` in the handler.
- **Logger placement.** `routes.use(logger())` ties the middleware to this router. Logging is usually an app level concern, so consider `index.ts` alongside `listen`.