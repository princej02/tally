import { Hono } from "hono";
import { logger } from "hono/logger";

type Env = {
  Variables: {
    db: string
  }
}

const routes = new Hono<Env>()

routes.use("*", async (c, next) => {
  c.set("db", "");
  await next()
})

routes.use(logger())

routes.notFound((c) => {
  return c.json({"message": "unknown endpoint"}, 404)
})

routes.get("/health", (c) => {
  return c.json({"status":"ok"})
})

routes.get("/expenses", (c) => {
  return c.text("")
})

routes.get("/balances", (c) => {
  return c.text("")
})

routes.post("/expenses", async (c) => {
  return c.text("")
})

export { routes }