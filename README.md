# Startora

Startora is a personal app dashboard with a React/Vite frontend and an
Express/SQLite backend. Authentication uses revocable, server-side sessions in
an `HttpOnly` cookie; browser state contains the signed-in user and their apps,
not the session credential.

## Requirements

- Node.js 24 LTS
- Corepack with pnpm enabled

## First-time setup

```powershell
corepack enable
pnpm install
```

The repository's pnpm workspace configuration allows the required
`better-sqlite3` and `esbuild` install scripts. pnpm blocks other dependency
build scripts by default.

## Development

```powershell
pnpm dev
```

The Vite client runs at `http://localhost:5173` and proxies `/api` to the
Express process on port 3000.

Useful commands:

```powershell
pnpm test
pnpm lint
pnpm build
pnpm start
```

`pnpm start` serves both the built client and API from Express.

## Configuration

Copy `.env.example` values into the environment used to launch the server.
Environment files are not loaded automatically, so secrets and deployment
configuration remain the responsibility of the process manager.

- `PORT`: Express port, default `3000`.
- `DATABASE_PATH`: SQLite file, default `data/startora.sqlite`.
- `APP_ORIGIN`: optional exact browser origin accepted for mutations. When it
  is omitted, Startora derives the allowed origin from the request protocol and
  host. The Vite development server uses `http://localhost:5173`.
- `COOKIE_SECURE`: optional `true` or `false` override for the session cookie's
  `Secure` attribute. When omitted, Startora follows the request protocol.
- `TRUST_PROXY`: optional Express proxy trust setting, such as `1` for one
  trusted proxy hop or `loopback` for a local proxy. Leave it unset when the
  container receives browser traffic directly.
- `NODE_ENV`: use `production` for production runtime behavior.

HTTPS is recommended for deployments exposed beyond a trusted network. SQLite
is intended for one Startora server process; use a network database before
scaling to multiple writers.

## App icons

Commit app icons to `src/assets` using `.svg`, `.png`, `.webp`, `.jpg`,
`.jpeg`, or `.avif`. The dashboard builds its picker from those files and saves
only the basename, such as `figma.svg`, to SQLite.

If an icon is removed after an app has been saved, the dashboard displays a
letter fallback instead of a broken image.

## Data and security

- Usernames are case-insensitively unique.
- Passwords are hashed with Node's `crypto.scrypt` and a random salt.
- Random session tokens expire after seven rolling days; only SHA-256 token
  hashes are stored.
- App queries derive the owner from the authenticated session.
- SQLite migrations run transactionally when the server opens the database.
