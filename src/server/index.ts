import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { handleLogin, authenticateToken } from './jwt';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.dev
dotenv.config({ path: path.join(__dirname, '../../.env.dev') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const startServer = async () => {
  const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'startora',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
  } catch (err) {
    console.error('Error connecting to PostgreSQL', err);
    process.exit(1);
  }

  // Check if users table exists, if not initialize the database
  try {
    const result = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    const tableExists = result.rows[0].exists;

    if (!tableExists) {
      console.log('Users table not found. Initializing database...');
      const initSqlPath = path.join(__dirname, '..', 'db', 'init-node.sql');
      const initSql = fs.readFileSync(initSqlPath, 'utf8');

      // Execute the init.sql script
      await client.query(initSql);
      console.log('Database initialized successfully');
    } else {
      console.log('Database tables already exist');
    }
  } catch (err) {
    console.error('Error initializing database', err);
    process.exit(1);
  }

  // Login route - generates JWT token
  app.post('/login', async (req: Request, res: Response) => {
    await handleLogin(req, res, client);
  });

  // Create a route to get all users
  app.get('/users', async (req: Request, res: Response) => {
    try {
      const result = await client.query('SELECT * FROM users');
      res.status(200).json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/user/:userid', async (req: Request, res: Response) => {
    const { userid } = req.params;
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [
        userid,
      ]);
      if (result.rows.length > 0) {
        res.status(200).json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get user's apps (protected route)
  app.get('/user/:userid/apps', authenticateToken, async (req: Request, res: Response) => {
    const { userid } = req.params;
    try {
      const result = await client.query(
        'SELECT * FROM user_apps WHERE user_id = $1',
        [userid]
      );
      res.status(200).json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add an app to user's apps (protected route)
  app.post('/user/:userid/apps', authenticateToken, async (req: Request, res: Response) => {
    const { userid } = req.params;
    const { appName, appData } = req.body;
    const app_name = appName;
    const app_data = appData;

    console.log('Adding app for user:', userid, app_name, app_data);
    try {
      const result = await client.query(
        'INSERT INTO user_apps (user_id, app_name, app_data) VALUES ($1, $2, $3) RETURNING *',
        [userid, app_name, app_data]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update a user's app (protected route)
  app.put('/user/:userid/apps/:appId', authenticateToken, async (req: Request, res: Response) => {
    const { userid, appId } = req.params;
    const { appName, appData } = req.body;
    try {
      const result = await client.query(
        'UPDATE user_apps SET app_name = $1, app_data = $2 WHERE user_id = $3 AND id = $4 RETURNING *',
        [appName, appData, userid, appId]
      );
      if (result.rows.length > 0) {
        res.status(200).json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'App not found' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a route to add a user
  app.post('/users', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const result = await client.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, hashedPassword]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      if (err.code === '23505') {
        // 23505 is the Postgres error code for "unique_violation" (duplicate email/username)
        return res.status(409).json({
          message: 'A user with this email or username already exists.',
        });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Create a route to save theme to current user's user_config table (protected route)
  app.post('/theme', authenticateToken, async (req: Request, res: Response) => {
    const { user_id, theme } = req.body;
    try {
      const result = await client.query(
        'INSERT INTO user_config (user_id, theme) VALUES ($1, $2) RETURNING *',
        [user_id, theme]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get theme of current user (protected route)
  app.get('/theme', authenticateToken, async (req: Request, res: Response) => {
    const { user_id } = req.query;
    try {
      const result = await client.query(
        'SELECT * FROM user_config WHERE user_id = $1',
        [user_id]
      );
      res.status(200).json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
