import { resolve } from "node:path";
import { createAppCatalogModule } from "./apps/module.js";
import { createAuthModule } from "./auth/module.js";
import { createCategoriesModule } from "./categories/module.js";
import { openDatabase } from "./db/database.js";
import { createHttpApp } from "./http/app.js";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be a valid TCP port.");
}

const databasePath =
  process.env.DATABASE_PATH ?? resolve(process.cwd(), "data/startora.sqlite");
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.APP_ORIGIN) {
  throw new Error("APP_ORIGIN is required in production.");
}
const appOrigin = new URL(process.env.APP_ORIGIN ?? "http://localhost:5173")
  .origin;
const database = openDatabase(databasePath);
const auth = createAuthModule(database);
const categories = createCategoriesModule(database);
const apps = createAppCatalogModule(database, undefined, categories);
const app = createHttpApp({
  auth,
  apps,
  categories,
  appOrigin,
  secureCookies: isProduction,
  clientDirectory: resolve(process.cwd(), "dist/client"),
});

const server = app.listen(port, () => {
  console.log(`Startora is listening on http://localhost:${port}`);
});

function shutdown(): void {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
