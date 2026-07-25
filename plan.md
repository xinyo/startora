Authenticated Node/SQLite Dashboard
Summary
Build a single-origin React/Vite + Express application backed by SQLite.
Organize the backend around two deep modules—authentication and app catalog—with thin HTTP adapters. This keeps session, validation, ownership, and persistence rules localized instead of spreading them across route handlers.
Use opaque cookie sessions rather than JWTs: this first-party dashboard benefits from simpler revocation and avoids exposing credentials to Zustand or browser storage. JWT access/refresh tokens would make more sense later for independent mobile or third-party clients.
Standardize on Node 24 LTS because the installed Node 21 runtime is EOL and better-sqlite3 supports maintained Node versions with LTS prebuilt binaries. Node releases, better-sqlite3 guidance.
Interfaces and Data
Expose these same-origin JSON routes:POST /api/auth/register — username/password, creates the account and session.
POST /api/auth/login — establishes a session.
GET /api/auth/session — returns the authenticated user.
POST /api/auth/logout — revokes the current session and clears its cookie.
GET /api/apps, POST /api/apps, PUT /api/apps/:id, DELETE /api/apps/:id — full CRUD scoped exclusively to the authenticated user.

Return User { id, username } and AppItem { id, name, icon, url, createdAt, updatedAt }. Use consistent { error: { code, message, fields? } } failures with 400, 401, 403, 404, and 409 statuses.
Create versioned transactional SQLite migrations for:users: case-preserving username, normalized unique username key, scrypt password hash, creation timestamp.
sessions: SHA-256 token hash, user foreign key, expiry/last-seen timestamps, cascade deletion.
apps: user foreign key, name, icon basename, URL, timestamps, and a user/creation-order index.

Enable foreign keys, WAL mode, and a busy timeout. Store the database at configurable DATABASE_PATH, defaulting to an ignored data/startora.sqlite.
Validate usernames as 3–50 ASCII letters, numbers, dots, underscores, or hyphens; passwords as 8–128 characters; names as trimmed 1–100 characters; URLs as fully qualified HTTP(S); and icons as safe basenames with supported image extensions.
Implementation Changes
Add approved production dependencies: express, better-sqlite3, @js-temporal/polyfill, and react-i18next. Add the TypeScript runner, Vitest/React test utilities, Express/SQLite types, and development process tooling as dev dependencies.
Add an auth module that:Hashes passwords with asynchronous crypto.scrypt, per-password random salts, and constant-time comparison.
Issues 256-bit random session tokens, stores only their hashes, and sets a seven-day rolling HttpOnly, SameSite=Lax, Path=/ cookie with Secure enabled in production.
Uses injected Temporal clock and random-token adapters for deterministic tests.
Performs same-origin checks on mutations, returns generic invalid-credential errors, cleans expired sessions opportunistically, and never logs credentials or tokens.

Add an app-catalog module using prepared SQL. Derive ownership from the session rather than accepting user IDs; cross-user update/delete attempts return 404. List apps newest-first.
Serve the built Vite client from Express in production and use a Vite /api proxy during development. Add Node 24 engine/runtime declarations, backend/client build configurations, start/dev scripts, and environment documentation.
Create views/welcome.tsx with translated, accessible login/register forms. Registration automatically logs the user in.
Wire React Router with /welcome, protected /, authenticated/anonymous redirects, initialization loading state, and a context-appropriate catch-all redirect.
Implement store/index.ts with authStatus, user, appsById, ordered app IDs, and initialization/login/register/logout/load/create/update/delete actions. The store calls /api/auth/session on startup and never stores the session token.
Replace the placeholder App.tsx with the dashboard: show the username and logout button, list app cards, open links in a new tab with noopener,noreferrer, and provide accessible create/edit and delete-confirmation dialogs.
Build an asset registry from src/assets using Vite glob imports. The picker offers supported assets, persists only the basename, and renders a generic fallback if a saved asset disappears.
Initialize English i18next resources and route all new labels, validation messages, dialogs, and status text through translation keys.
Fix the existing unused React import in the shared button module so the baseline TypeScript build succeeds.
Test Plan
Place every test under /tests and configure Vitest for Node backend tests and jsdom React tests without using JavaScript Date.
Test registration, case-insensitive duplicate rejection, password hashing, login failures, session lookup, rolling expiry, expired sessions, logout revocation, cookie security attributes, and origin protection using in-memory SQLite and fixed Temporal time.
Test complete app CRUD, validation, ordering, user isolation, missing/not-owned records, and database migration from an empty file.
Test Zustand initialization and all auth/app state transitions with mocked HTTP responses, including 401 state clearing and record indexing.
Test routing guards, auto-login after registration, username display, logout navigation, accessible forms/dialogs, CRUD behavior, icon fallback, translated text, and safe external-link attributes.
Finish with pnpm test, pnpm lint, and pnpm build.
Assumptions and Boundaries
The release includes full app CRUD but not icon uploads, account editing, password reset, roles, or administration.
Icon files are committed to src/assets; only their basenames enter SQLite.
Logout revokes the current browser session, not every session belonging to the user.
SQLite is intended for a single Node process or small deployment. A multi-instance/high-write deployment should later replace it with PostgreSQL behind the same module interfaces.
Production runs behind HTTPS and should enforce additional edge-level login rate limiting.
Existing React migration work is preserved; deleted Vue/PostgreSQL files are not restored.