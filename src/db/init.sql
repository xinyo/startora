-- init.sql
CREATE DATABASE IF NOT EXISTS startora;
\c startora;
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL
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