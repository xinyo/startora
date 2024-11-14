# Use official Node.js image
FROM node:21

# Install PostgreSQL
RUN apt-get update && apt-get install -y postgresql postgresql-contrib

# Set working directory for our app
WORKDIR /app

# Install dependencies for both client and server
COPY package.json package-lock.json ./
RUN npm install

# Copy the PostgreSQL initialization script
COPY ./src/db/init.sql /docker-entrypoint-initdb.d/

# Copy server and client code
COPY ./src/server ./server
COPY ./src/client ./client

# Set up environment variables
ENV NODE_ENV=production
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_USER=postgres
ENV DB_PASSWORD=password
ENV DB_NAME=startora

# Install dependencies for Vite (client-side)
WORKDIR /app/client
RUN npm install

# Expose the required ports (Node.js API and Vite dev server)
EXPOSE 3000 5173

# Start PostgreSQL, Node.js API, and Vite front-end on container start
CMD service postgresql start && \
    node /app/server/index.js & \
    cd /app/client && npm run dev
