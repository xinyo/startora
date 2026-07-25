# ---- Stage 1: base image with build tools for native modules ----
FROM node:24-alpine AS base
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# ---- Stage 2: install all dependencies ----
FROM base AS deps
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

# ---- Stage 3: build the application ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
# Remove devDependencies — only production modules survive
RUN pnpm prune --prod

# ---- Stage 4: minimal production image ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Writable volume for SQLite database
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-3000}/api/auth/session', (r) => { process.exit(r.statusCode >= 500 ? 1 : 0) }).on('error', () => process.exit(1))"

# Run as non-root user
USER node

CMD ["node", "dist/server/server/index.js"]
