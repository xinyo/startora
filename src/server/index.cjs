// index.js

const express = require("express");
const cors = require("cors");
const { Client } = require("pg");
const app = express();

app.use(cors()); // This allows cross-origin requests from any origin
app.use(express.json()); // Middleware to parse JSON request bodies

// PostgreSQL connection configuration
const client = new Client({
  user: "postgres", // Your PostgreSQL username
  host: "localhost", // The host where PostgreSQL is running (localhost for local setup)
  database: "startora", // The database to connect to
  password: "luguodewo", // Your PostgreSQL password
  port: 5432, // Default PostgreSQL port
});

// Connect to PostgreSQL
client
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Error connecting to PostgreSQL", err));

// Create a route to get all users
app.get("/users", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM users");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/user/:userid", async (req, res) => {
  const { userid } = req.params;
  try {
    const result = await client.query("SELECT * FROM users WHERE id = $1", [
      userid,
    ]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//get user's apps
app.get("/user/:userid/apps", async (req, res) => {
  const { userid } = req.params;
  try {
    const result = await client.query(
      "SELECT * FROM user_apps WHERE user_id = $1",
      [userid]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//add a app to user's apps
app.post("/user/:userid/apps", async (req, res) => {
  const { userid } = req.params;
  const { appName, appData } = req.body;
  const app_name = appName;
  const app_data = appData;

  console.log("Adding app for user:", userid, app_name, app_data);
  try {
    const result = await client.query(
      "INSERT INTO user_apps (user_id, app_name, app_data) VALUES ($1, $2, $3) RETURNING *",
      [userid, app_name, app_data]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// update a user's app
app.put("/user/:userid/apps/:appId", async (req, res) => {
  const { userid, appId } = req.params;
  const { appName, appData } = req.body;
  try {
    const result = await client.query(
      "UPDATE user_apps SET app_name = $1, app_data = $2 WHERE user_id = $3 AND id = $4 RETURNING *",
      [appName, appData, userid, appId]
    );
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: "App not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a route to add a user
app.post("/users", async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await client.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create a route to save theme to current user's user_config table
app.post("/theme", async (req, res) => {
  const { user_id, theme } = req.body;
  try {
    const result = await client.query(
      "INSERT INTO user_config (user_id, theme) VALUES ($1, $2) RETURNING *",
      [user_id, theme]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get theme of current user
app.get("/theme", async (req, res) => {
  const { user_id } = req.query;
  try {
    const result = await client.query(
      "SELECT * FROM user_config WHERE user_id = $1",
      [user_id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
