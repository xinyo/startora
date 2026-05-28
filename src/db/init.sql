-- init-node.sql
-- Node.js compatible initialization script (no psql meta-commands)
-- This file is used by the pg driver for programmatic database initialization

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

-- create table for config for users
CREATE TABLE IF NOT EXISTS user_config (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  config JSONB
);

-- create table for user's apps
CREATE TABLE IF NOT EXISTS user_apps (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  app_name VARCHAR(100) NOT NULL,
  app_data JSONB
);

CREATE TABLE IF NOT EXISTS refresh_sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
