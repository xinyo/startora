import { resolve } from "node:path";
import { createAppCatalogModule } from "./apps/module.js";
import { createAuthModule } from "./auth/module.js";
import { createCategoriesModule } from "./categories/module.js";
import {
  parseOptionalBoolean,
  parseOptionalOrigin,
  parseTrustProxy,
} from "./config.js";
import { openDatabase } from "./db/database.js";
import { createHttpApp } from "./http/app.js";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be a valid TCP port.");
}

const databasePath =
  process.env.DATABASE_PATH ?? resolve(process.cwd(), "data/startora.sqlite");
const appOrigin = parseOptionalOrigin(process.env.APP_ORIGIN);
const secureCookies = parseOptionalBoolean(
  process.env.COOKIE_SECURE,
  "COOKIE_SECURE",
);
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
const database = openDatabase(databasePath);
const auth = createAuthModule(database);
const categories = createCategoriesModule(database);
const apps = createAppCatalogModule(database, undefined, categories);
const app = createHttpApp({
  auth,
  apps,
  categories,
  appOrigin,
  secureCookies,
  trustProxy,
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
