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
pnpm approve-builds
```

When `pnpm approve-builds` prompts for packages, select both `better-sqlite3`
and `esbuild` (press `a` to select all), then confirm the selection. pnpm blocks
dependency build scripts by default; without this approval, the server cannot
load the native `better-sqlite3` binding.

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
- `APP_ORIGIN`: exact browser origin accepted for mutations. Development
  defaults to `http://localhost:5173`.
- `NODE_ENV`: set to `production` to enable the cookie's `Secure` attribute.

Production must run behind HTTPS. SQLite is intended for one Startora server
process; use a network database before scaling to multiple writers.

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
