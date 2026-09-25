import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { calculateBalances } from "../core/balance";
import type { ExpenseStore } from "../infra/expenses";
import { createExpenseSchema, formatZodError } from "./schemas";

export function createRoutes(expenseStore: ExpenseStore) {
  const routes = new Hono()

  routes.notFound((c) => {
    return c.json({ message: "unknown endpoint" }, 404)
  })

  routes.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ message: err.message }, err.status)
    }

    console.error(err)
    return c.json({ message: "internal server error" }, 500)
  })

  routes.get("/health", (c) => {
    return c.json({ status: "ok" })
  })

  routes.get("/expenses", (c) => {
    const expenses = expenseStore.selectAll()
    return c.json({ expenses })
  })

  routes.get("/balances", (c) => {
    const expenses = expenseStore.selectAll()
    return c.json({ balances: calculateBalances(expenses) })
  })

  routes.post("/expenses", async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = createExpenseSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ issues: formatZodError(parsed.error) }, 400)
    }

    const expense = expenseStore.insert(parsed.data)
    return c.json(expense, 201)
  })

  return routes
}
