# Local Development Setup

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [vite.config.ts](file://vite.config.ts)
- [docker-compose.yml](file://docker-compose.yml)
- [Dockerfile](file://Dockerfile)
- [src/server/index.cjs](file://src/server/index.cjs)
- [src/db/init.sql](file://src/db/init.sql)
- [src/client/main.ts](file://src/client/main.ts)
- [src/client/router.ts](file://src/client/router.ts)
- [src/client/store/index.ts](file://src/client/store/index.ts)
- [src/client/views/Home.vue](file://src/client/views/Home.vue)
- [src/client/components/main.vue](file://src/client/components/main.vue)
- [src/client/types/store.d.ts](file://src/client/types/store.d.ts)
- [src/client/types/user.d.ts](file://src/client/types/user.d.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Project Bootstrapping](#project-bootstrapping)
6. [Development Server Startup](#development-server-startup)
7. [IDE Setup and Debugging](#ide-setup-and-debugging)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)

## Introduction
This guide provides a complete, step-by-step walkthrough for setting up Startora's local development environment. It covers prerequisites, environment configuration, database initialization, project bootstrapping, and running the development server with Vite and Express. It also includes IDE setup recommendations, debugging tips, and troubleshooting guidance for common issues.

## Prerequisites
- Node.js: Recommended version is 16 or higher. The project targets modern Node.js versions and uses ES modules.
- Package manager: pnpm, npm, or yarn. The repository demonstrates pnpm usage in the quick start.
- PostgreSQL: Required for data persistence. You can install PostgreSQL locally or use Docker Compose to run a containerized instance.
- Git: To clone and manage the repository.

Key references:
- [README.md: Prerequisites section:60-64](file://README.md#L60-L64)
- [README.md: Tech stack overview:15-32](file://README.md#L15-L32)

**Section sources**
- [README.md: Prerequisites section:60-64](file://README.md#L60-L64)
- [README.md: Tech stack overview:15-32](file://README.md#L15-L32)

## Environment Variables
The backend reads database credentials and runtime settings from environment variables. The server supports the following variables:
- PG_USER: PostgreSQL user (default: postgres)
- PG_HOST: PostgreSQL host (default: localhost)
- PG_DATABASE: Database name (default: startora)
- PG_PORT: PostgreSQL port (default: 5432)
- PGPASSWORD or PG_PASSWORD: PostgreSQL password (prompted if not set)

Notes:
- If PG_PASSWORD is not set, the server will prompt for the password at startup.
- The default API base URL for the frontend is http://localhost:3000.

References:
- [src/server/index.cjs: Environment variable handling:12-36](file://src/server/index.cjs#L12-L36)
- [README.md: API base URL note:125-126](file://README.md#L125-L126)

**Section sources**
- [src/server/index.cjs: Environment variable handling:12-36](file://src/server/index.cjs#L12-L36)
- [README.md: API base URL note:125-126](file://README.md#L125-L126)

## Database Setup
Follow these steps to prepare the PostgreSQL database:

1. Ensure PostgreSQL is installed and running.
2. Create the database named startora.
3. Initialize the schema by running the provided SQL script.

References:
- [README.md: Database setup instructions:73-96](file://README.md#L73-L96)
- [src/db/init.sql: Initialization script:1-26](file://src/db/init.sql#L1-L26)

**Section sources**
- [README.md: Database setup instructions:73-96](file://README.md#L73-L96)
- [src/db/init.sql: Initialization script:1-26](file://src/db/init.sql#L1-L26)

## Project Bootstrapping
Install dependencies and prepare the project for development:

1. Install dependencies using your preferred package manager.
2. Start the development environment using the provided script.

References:
- [README.md: Install dependencies:65-71](file://README.md#L65-L71)
- [README.md: Start development servers:97-105](file://README.md#L97-L105)
- [package.json: Scripts:6-11](file://package.json#L6-L11)

**Section sources**
- [README.md: Install dependencies:65-71](file://README.md#L65-L71)
- [README.md: Start development servers:97-105](file://README.md#L97-L105)
- [package.json: Scripts:6-11](file://package.json#L6-L11)

## Development Server Startup
Start the full development environment with both the frontend and backend:

- The frontend runs on Vite (port 5173).
- The backend runs on Express (port 3000).
- The combined development experience is described in the quick start.

References:
- [README.md: Development server startup:97-105](file://README.md#L97-L105)
- [package.json: Scripts:6-11](file://package.json#L6-L11)

**Section sources**
- [README.md: Development server startup:97-105](file://README.md#L97-L105)
- [package.json: Scripts:6-11](file://package.json#L6-L11)

## IDE Setup and Debugging
Recommended IDE configuration for a smooth development experience:

- Use VS Code for optimal integration with Vue, TypeScript, and Vite.
- Install recommended extensions for Vue, TypeScript, and ESLint if available.
- Configure breakpoints in both frontend and backend code:
  - Frontend breakpoints in Vue components and store actions.
  - Backend breakpoints in Express routes and database queries.
- Use the integrated terminal to run the development scripts.

References:
- [README.md: IDE-friendly setup:1-147](file://README.md#L1-L147)

**Section sources**
- [README.md: IDE-friendly setup:1-147](file://README.md#L1-L147)

## Development Workflow
The typical development workflow includes:

- Editing frontend code in Vue components and TypeScript files.
- Using Pinia for state management and interacting with the backend API.
- Testing changes in the browser at http://localhost:5173.
- Verifying backend API responses at http://localhost:3000.

Key frontend entrypoints and components:
- Frontend entry: [src/client/main.ts:1-11](file://src/client/main.ts#L1-L11)
- Router: [src/client/router.ts:1-24](file://src/client/router.ts#L1-L24)
- Store: [src/client/store/index.ts:1-91](file://src/client/store/index.ts#L1-L91)
- Home view: [src/client/views/Home.vue:1-62](file://src/client/views/Home.vue#L1-L62)
- Main component: [src/client/components/main.vue:1-109](file://src/client/components/main.vue#L1-L109)
- Types: [src/client/types/store.d.ts:1-7](file://src/client/types/store.d.ts#L1-L7), [src/client/types/user.d.ts:1-6](file://src/client/types/user.d.ts#L1-L6)

Backend entrypoint and API routes:
- Backend entry: [src/server/index.cjs:1-173](file://src/server/index.cjs#L1-L173)

References:
- [README.md: Key entrypoints and config:120-127](file://README.md#L120-L127)

**Section sources**
- [README.md: Key entrypoints and config:120-127](file://README.md#L120-L127)
- [src/client/main.ts:1-11](file://src/client/main.ts#L1-L11)
- [src/client/router.ts:1-24](file://src/client/router.ts#L1-L24)
- [src/client/store/index.ts:1-91](file://src/client/store/index.ts#L1-L91)
- [src/client/views/Home.vue:1-62](file://src/client/views/Home.vue#L1-L62)
- [src/client/components/main.vue:1-109](file://src/client/components/main.vue#L1-L109)
- [src/client/types/store.d.ts:1-7](file://src/client/types/store.d.ts#L1-L7)
- [src/client/types/user.d.ts:1-6](file://src/client/types/user.d.ts#L1-L6)
- [src/server/index.cjs:1-173](file://src/server/index.cjs#L1-L173)

## Troubleshooting Guide
Common issues and resolutions:

- PostgreSQL connection errors
  - Symptom: Backend fails to connect to PostgreSQL.
  - Resolution: Verify the database exists and credentials match environment variables. Confirm the password is set via PG_PASSWORD or PGPASSWORD, or enter it when prompted.
  - References: [src/server/index.cjs: Connection and environment handling:12-44](file://src/server/index.cjs#L12-L44)

- Port conflicts
  - Symptom: Ports 3000 or 5173 are already in use.
  - Resolution: Stop conflicting processes or adjust the ports in your environment configuration.
  - References: [src/server/index.cjs: Port binding:166-169](file://src/server/index.cjs#L166-L169), [README.md: Development server startup:97-105](file://README.md#L97-L105)

- Missing dependencies
  - Symptom: Errors during install or dev run.
  - Resolution: Reinstall dependencies using the supported package managers (pnpm, npm, yarn).
  - References: [README.md: Install dependencies:65-71](file://README.md#L65-L71), [package.json: Dependencies:12-29](file://package.json#L12-L29)

- CORS issues
  - Symptom: Cross-origin requests blocked by the browser.
  - Resolution: The backend enables CORS globally. Ensure the frontend and backend are running on the expected ports.
  - References: [src/server/index.cjs: CORS middleware:9-11](file://src/server/index.cjs#L9-L11)

- Hot reload not working
  - Symptom: Changes to frontend code do not trigger updates.
  - Resolution: Confirm Vite is running on port 5173 and that the browser is accessing the correct URL. Check for syntax errors in Vue components or TypeScript files.
  - References: [README.md: Development server startup:97-105](file://README.md#L97-L105), [vite.config.ts: Vite configuration:1-13](file://vite.config.ts#L1-L13)

- Docker-based development
  - Symptom: Containerization issues or port mapping problems.
  - Resolution: Review the Docker Compose and Dockerfile configurations for port exposure and environment variables.
  - References: [docker-compose.yml: Services and ports:1-27](file://docker-compose.yml#L1-L27), [Dockerfile: CMD and ports:33-40](file://Dockerfile#L33-L40)

**Section sources**
- [src/server/index.cjs: Connection and environment handling:12-44](file://src/server/index.cjs#L12-L44)
- [src/server/index.cjs: Port binding:166-169](file://src/server/index.cjs#L166-L169)
- [README.md: Development server startup:97-105](file://README.md#L97-L105)
- [package.json: Dependencies:12-29](file://package.json#L12-L29)
- [src/server/index.cjs: CORS middleware:9-11](file://src/server/index.cjs#L9-L11)
- [vite.config.ts: Vite configuration:1-13](file://vite.config.ts#L1-L13)
- [docker-compose.yml: Services and ports:1-27](file://docker-compose.yml#L1-L27)
- [Dockerfile: CMD and ports:33-40](file://Dockerfile#L33-L40)

## Conclusion
You now have the essential steps to set up Startora’s local development environment, configure environment variables, initialize the database, and run the development servers. Use the provided references to troubleshoot common issues and follow the development workflow to build and test features efficiently.