# Use official Node.js image
FROM node:21-alpine

# Set working directory for our app
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies for the server
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod

# Copy server code
COPY ./src/server ./src/server

# Set up environment variables
ENV NODE_ENV=production
ENV PG_HOST=db
ENV PG_PORT=5432
ENV PG_USER=postgres
ENV PG_PASSWORD=password
ENV PG_DATABASE=startora

# Expose the backend port
EXPOSE 3000

# Start Node.js API
CMD ["node", "src/server/index.cjs"]
