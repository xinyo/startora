# Gemini Developer Guide - Startora

This document serves as a guide for AI assistants (like Gemini) to understand the **Startora** project structure, architecture, and development patterns.

## 🚀 Project Overview

**Startora** is a personal start page and navigation application. It allows users to manage a collection of shortcut links (apps) with a modern, clean UI.

- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite, TypeScript, Pinia, Naive UI.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL.
- **Key Feature**: A unified dashboard for personal or team shortcut management.

## 🏗 Architecture

The project follows a standard full-stack monorepo-style structure within the `src` directory:

```text
src/
├── client/           # Frontend (Vue 3)
│   ├── assets/       # Static files (logos, icons)
│   ├── components/   # UI components
│   ├── store/        # Pinia state management
│   ├── types/        # TypeScript definitions
│   └── main.ts       # Entry point
├── server/           # Backend (Express)
│   ├── index.cjs     # Express server & API routes
│   └── api.ts        # (Potential) Shared API logic/types
└── db/               # Database
    └── init.sql      # Schema initialization
```

## 🛠 Tech Stack Details

### Frontend
- **Framework**: Vue 3 with `script setup` syntax.
- **Styling**: Standard CSS (in `style.css`) and Naive UI components.
- **State**: Pinia is used for managing user session and app list.
- **Communication**: Axios for API calls to the Express backend.

### Backend
- **Express**: Handles RESTful endpoints for user authentication and CRUD operations on apps.
- **CommonJS**: The server entry point is `index.cjs`.

### Database
- **PostgreSQL**: Stores `users` and `apps` tables.
- **Initialization**: Schema is defined in `src/db/init.sql`.

## 📂 Key Files for Development

- **[App.vue](file:///Users/xinyo/dev/github.com/startora/src/client/App.vue)**: Root frontend component.
- **[main.vue](file:///Users/xinyo/dev/github.com/startora/src/client/components/main.vue)**: Primary dashboard display.
- **[config.vue](file:///Users/xinyo/dev/github.com/startora/src/client/components/config.vue)**: App management interface (add/edit/delete).
- **[index.cjs](file:///Users/xinyo/dev/github.com/startora/src/server/index.cjs)**: Main server file containing API routes and DB logic.
- **[init.sql](file:///Users/xinyo/dev/github.com/startora/src/db/init.sql)**: Database schema.

## 🔄 Development Workflow

1.  **Environment Setup**:
    - Ensure PostgreSQL is running and a database named `startora` exists.
    - Install dependencies: `pnpm install`.
2.  **Running Locally**:
    - Start both frontend and backend: `npm run dev`.
    - Frontend runs on `http://localhost:5173`.
    - Backend runs on `http://localhost:3000`.
3.  **Database Updates**:
    - Modify `src/db/init.sql` for schema changes.
    - Apply changes to the local PostgreSQL instance.

## 📝 Coding Conventions

- **Components**: Use Vue 3 Composition API with `<script setup lang="ts">`.
- **Types**: Always define interfaces in `src/client/types/` for data structures.
- **API**: Keep backend routes clean; logic for DB interaction should be easily traceable in `index.cjs`.
- **Naming**: Use camelCase for variables/functions and PascalCase for components.

## 💡 AI Assistance Tips

- When adding new features, check `src/client/types/` first to ensure data structures are aligned.
- For UI changes, refer to [Naive UI documentation](https://www.naiveui.com/).
- When debugging backend issues, check the database connection settings in `src/server/index.cjs`.
