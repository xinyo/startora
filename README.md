# Startora

## Project Overview

Startora is a modern personal start page/navigation app built with Vue 3 + TypeScript + Vite. It provides a simple UI for users to add, edit, and manage shortcut apps. The backend uses Node.js (Express) and PostgreSQL for data persistence, suitable for personal dashboards or team link collections.

## ✨ Features

- **App management**: Add, edit, and remove shortcut apps (name, URL).
- **Data persistence**: Store user data and app configuration in PostgreSQL.
- **Modern UI**: Built with Naive UI for a clean experience.
- **Full-stack workflow**: Frontend and backend run together via Concurrently.
- **Type safety**: TypeScript across the frontend with shared types.

## 🛠 Tech Stack

### Frontend
- **Framework**: [Vue 3](https://vuejs.org/) (Script Setup)
- **Build tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State management**: [Pinia](https://pinia.vuejs.org/)
- **UI library**: [Naive UI](https://www.naiveui.com/)
- **HTTP client**: [Axios](https://axios-http.com/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Web framework**: [Express](https://expressjs.com/)
- **DB driver**: [pg](https://node-postgres.com/)

### Database
- **Database**: [PostgreSQL](https://www.postgresql.org/)

## 📂 Project Structure

```
startora/
├── src/
│   ├── client/           # Frontend source
│   │   ├── assets/       # Static assets
│   │   ├── components/   # Vue components (Login, Main, Config, etc.)
│   │   ├── store/        # Pinia stores
│   │   ├── types/        # TypeScript type definitions
│   │   ├── App.vue       # Root component
│   │   └── main.ts       # Frontend entry
│   ├── server/           # Backend source
│   │   ├── api.ts        # API client
│   │   └── index.cjs     # Express entry
│   └── db/               # Database scripts
│       └── init.sql      # Database init SQL
├── .vscode/              # VS Code config
├── public/               # Public assets
├── docker-compose.yml    # Docker compose file
├── package.json          # Scripts and dependencies
├── vite.config.ts        # Vite config
└── ...
```

## 🚀 Quick Start

### Prerequisites
- Node.js (recommended v16+)
- PostgreSQL (or Docker)
- pnpm / npm / yarn

### 1. Install dependencies

```bash
pnpm install
# or
npm install
```

### 2. Database setup

Ensure PostgreSQL is installed and create a database named `startora`.
If you use Homebrew, you can install PostgreSQL 15:

```bash
brew install postgresql@15
```

Run the init script:

```bash
psql -U postgres
\i src/db/init.sql
```

> **Note**: Backend connection config is in `src/server/index.cjs` with defaults:
> - User: `postgres`
> - Password: configure locally
> - Host: `localhost`
> - Port: `5432`
>
> Update it to match your local environment.

### 3. Start development servers

This runs Vite and Express together:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Build for production

```bash
npm run build
```

## 🧩 Usage Example

1. Open `http://localhost:5173` after starting the dev server
2. Enter App Name and App URL
3. Click add app to create a shortcut
4. Click the edit button on a card to update name or URL

## 🔑 Key Entrypoints & Config

- Frontend entry: `src/client/main.ts`
- Frontend root: `src/client/App.vue`
- Backend entry: `src/server/index.cjs`
- API base URL: `http://localhost:3000`
- Build config: `vite.config.ts`

## 📖 Directory Notes

- **`src/client`**: Frontend logic. `components/main.vue` is the main display; `components/config.vue` handles configuration.
- **`src/server`**: Express server providing REST APIs for user and app CRUD operations.
- **`src/db`**: SQL schema and initialization scripts.

## 🤝 Contributing

Issues and pull requests are welcome.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## 📄 License

待补充
