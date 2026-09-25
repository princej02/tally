import { Database } from "bun:sqlite";
import { createExpenseStore } from "./infra/expenses";
import { createRoutes } from "./api/routes";
import { logger } from "hono/logger";
import { Hono } from "hono";

const db = new Database(process.env.DB_PATH ?? "tally.sqlite");
const expenseStore = createExpenseStore(db);
const app = new Hono()
app.use(logger())
app.route("/", createRoutes(expenseStore))
const port = Number(process.env.PORT ?? 3000);

const shutdown = () => {
  db.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default {
  port,
  fetch: app.fetch,
};
