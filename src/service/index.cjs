// index.js


const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const app = express();

app.use(cors());  // This allows cross-origin requests from any origin
app.use(express.json());  // Middleware to parse JSON request bodies

// PostgreSQL connection configuration
const client = new Client({
  user: 'postgres',     // Your PostgreSQL username
  host: 'localhost',    // The host where PostgreSQL is running (localhost for local setup)
  database: 'startora',     // The database to connect to
  password: 'luguodewo', // Your PostgreSQL password
  port: 5432,           // Default PostgreSQL port
});

// Connect to PostgreSQL
client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Error connecting to PostgreSQL', err));

// Create a route to get all users
app.get('/users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a route to add a user
app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await client.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
