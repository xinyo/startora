# Getting Started

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [src/server/index.cjs](file://src/server/index.cjs)
- [src/db/init.sql](file://src/db/init.sql)
- [docker-compose.yml](file://docker-compose.yml)
- [Dockerfile](file://Dockerfile)
- [vite.config.ts](file://vite.config.ts)
- [src/client/main.ts](file://src/client/main.ts)
- [tsconfig.json](file://tsconfig.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Development Server](#development-server)
7. [Production Build](#production-build)
8. [Docker Alternative](#docker-alternative)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)

## Introduction

Startora is a modern personal start page/navigation application built with Vue 3 + TypeScript + Vite. It provides a simple UI for users to add, edit, and manage shortcut applications. The backend uses Node.js (Express) and PostgreSQL for data persistence, making it suitable for personal dashboards or team link collections.

The application features a clean modern interface built with Naive UI, full-stack workflow with concurrent development servers, and TypeScript across the frontend with shared types. It offers app management capabilities, data persistence in PostgreSQL, and a responsive design for both personal and team use.

## Prerequisites

Before installing Startora, ensure you have the following prerequisites:

### Node.js Requirements
- **Recommended**: Node.js v16 or higher
- The project uses modern JavaScript features and requires a recent Node.js version for optimal compatibility

### Database Requirements
- **PostgreSQL**: Required for data persistence
- Alternatively, you can use Docker for automatic database setup

### Package Manager Options
- **pnpm**: Recommended for faster installations
- **npm**: Standard Node.js package manager
- **yarn**: Alternative package manager

### Additional Tools
- Git for version control (recommended)
- Basic command-line familiarity

**Section sources**
- [README.md:60-63](file://README.md#L60-L63)
- [package.json:1-31](file://package.json#L1-L31)

## Installation

Follow these step-by-step installation instructions to set up Startora locally:

### Step 1: Clone the Repository
First, clone the Startora repository to your local machine using Git:

```bash
git clone <repository-url>
cd startora
```

### Step 2: Install Dependencies

Choose one of the following package managers to install dependencies:

**Using pnpm (recommended):**
```bash
pnpm install
```

**Using npm:**
```bash
npm install
```

**Using yarn:**
```bash
yarn install
```

The project uses modern JavaScript features and requires a recent Node.js version for optimal compatibility.

**Section sources**
- [README.md:65-71](file://README.md#L65-L71)
- [package.json:12-21](file://package.json#L12-L21)

## Database Setup

Startora requires a PostgreSQL database for data persistence. Follow these steps to set up your database:

### Option A: Manual PostgreSQL Setup

1. **Install PostgreSQL**: Ensure PostgreSQL is installed on your system
2. **Create Database**: Create a database named `startora`
3. **Run Initialization Script**: Execute the initialization script to create required tables

```bash
# Connect to PostgreSQL
psql -U postgres

# Run the initialization script
\i src/db/init.sql
```

### Option B: Using Homebrew (macOS)

If you're using macOS with Homebrew, you can install PostgreSQL 15:

```bash
brew install postgresql@15
```

### Database Schema Overview

The initialization script creates three essential tables:

- **users**: Stores user information (id, name, email)
- **user_config**: Stores user-specific configuration data
- **user_apps**: Stores user application shortcuts

**Section sources**
- [README.md:73-87](file://README.md#L73-L87)
- [src/db/init.sql:1-26](file://src/db/init.sql#L1-L26)

## Environment Configuration

Startora uses environment variables for database connection configuration. The backend automatically detects and uses the following environment variables:

### Available Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `PG_USER` | PostgreSQL username | `postgres` |
| `PG_PASSWORD` | PostgreSQL password | Prompted if not set |
| `PG_HOST` | Database host | `localhost` |
| `PG_PORT` | Database port | `5432` |
| `PG_DATABASE` | Database name | `startora` |

### Configuration Methods

**Method 1: Environment Variables**
Set environment variables in your shell session:

```bash
export PG_USER=your_username
export PG_PASSWORD=your_password
export PG_HOST=localhost
export PG_PORT=5432
export PG_DATABASE=startora
```

**Method 2: Process Environment**
The application will prompt for the PostgreSQL password if not provided via environment variables.

**Method 3: Docker Configuration**
When using Docker, environment variables are configured in the docker-compose.yml file:

```yaml
environment:
  - DB_HOST=localhost
  - DB_PORT=5432
  - DB_USER=postgres
  - DB_PASSWORD=password
  - DB_NAME=startora
```

**Section sources**
- [src/server/index.cjs:12-36](file://src/server/index.cjs#L12-L36)
- [docker-compose.yml:12-18](file://docker-compose.yml#L12-L18)

## Development Server

Startora provides a development server that runs both the frontend and backend simultaneously:

### Starting the Development Server

```bash
npm run dev
```

This command starts:
- **Frontend**: Vite development server on port 5173
- **Backend**: Express server on port 3000

### Accessing the Application

Once both servers are running, access the application in your browser:

**Frontend**: [http://localhost:5173](http://localhost:5173)
**Backend API**: [http://localhost:3000](http://localhost:3000)

### Development Workflow

The development setup provides hot reloading for both frontend and backend changes. The application uses:

- **Frontend**: Vue 3 with TypeScript and Vite
- **Backend**: Express.js with PostgreSQL connectivity
- **Build Tool**: Vite for fast development builds

**Section sources**
- [README.md:97-105](file://README.md#L97-L105)
- [package.json:6-11](file://package.json#L6-L11)

## Production Build

To build Startora for production deployment:

### Building the Application

```bash
npm run build
```

This command performs two main tasks:
1. **TypeScript Compilation**: Compiles TypeScript files to JavaScript
2. **Vite Build**: Creates optimized production bundles

### Build Output

The build process generates optimized static assets in the `dist` directory, ready for deployment to any static hosting service or containerized environment.

### Production Environment

For production deployment, ensure you set the following environment variables:

```bash
export NODE_ENV=production
export PG_USER=your_production_user
export PG_PASSWORD=your_production_password
export PG_HOST=your_database_host
export PG_PORT=5432
export PG_DATABASE=your_production_database
```

**Section sources**
- [README.md:107-111](file://README.md#L107-L111)
- [package.json:9](file://package.json#L9)

## Docker Alternative

Startora provides Docker support for containerized deployment. The Docker setup includes:

### Docker Compose Configuration

The `docker-compose.yml` file defines:
- **Application Container**: Runs both frontend and backend
- **PostgreSQL Service**: Database service with persistent storage
- **Port Mapping**: Exposes ports 3000 (backend) and 5173 (frontend)
- **Environment Variables**: Pre-configured database credentials

### Building and Running with Docker

```bash
# Build the Docker image
docker-compose build

# Start the containers
docker-compose up
```

### Dockerfile Overview

The Dockerfile:
- Uses Node.js 21 as the base image
- Installs PostgreSQL client tools
- Copies and installs dependencies
- Sets up environment variables
- Starts both PostgreSQL and application services

**Section sources**
- [docker-compose.yml:1-27](file://docker-compose.yml#L1-L27)
- [Dockerfile:1-40](file://Dockerfile#L1-L40)

## Troubleshooting Guide

Common issues and their solutions when setting up Startora:

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL
**Solution**: Verify database credentials and connection settings

```bash
# Test database connection
psql -h localhost -p 5432 -U postgres -d startora
```

**Problem**: Database does not exist
**Solution**: Run the initialization script to create the database and tables

```bash
psql -U postgres
\i src/db/init.sql
```

### Port Conflicts

**Problem**: Ports 3000 or 5173 are already in use
**Solution**: Change the port numbers in your environment configuration

```bash
export PORT=3001  # Change backend port
export VITE_DEV_SERVER_PORT=5174  # Change frontend port
```

### Node.js Version Issues

**Problem**: Compatibility errors with older Node.js versions
**Solution**: Upgrade to Node.js v16 or higher

```bash
# Check Node.js version
node --version

# Upgrade if needed
```

### Package Installation Problems

**Problem**: Dependency installation fails
**Solution**: Clear package cache and retry

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS Issues

**Problem**: Frontend cannot communicate with backend
**Solution**: Verify CORS configuration is enabled

The backend automatically enables CORS middleware, but ensure both frontend and backend are running on the expected ports.

### Environment Variable Issues

**Problem**: Environment variables not being recognized
**Solution**: Verify variable names and export statements

```bash
# Check if variables are set
echo $PG_USER
echo $PG_PASSWORD

# Export variables if missing
export PG_USER=postgres
export PG_PASSWORD=your_password
```

**Section sources**
- [src/server/index.cjs:38-44](file://src/server/index.cjs#L38-L44)
- [README.md:89-95](file://README.md#L89-L95)

## Conclusion

You have successfully set up Startora for development and production use. The application provides a solid foundation for managing personal or team navigation shortcuts with a modern Vue 3 + TypeScript + Vite frontend and Express + PostgreSQL backend.

Key takeaways:
- Startora requires Node.js v16+ and PostgreSQL for full functionality
- Choose your preferred package manager (pnpm, npm, or yarn) for dependency management
- Configure database connection through environment variables or Docker configuration
- Use `npm run dev` for development and `npm run build` for production
- Leverage Docker for containerized deployment if preferred

For ongoing development, remember to:
- Keep dependencies updated regularly
- Monitor database performance as user count grows
- Consider implementing proper authentication for production deployments
- Back up your PostgreSQL database regularly

Happy developing with Startora!