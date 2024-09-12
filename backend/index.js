require('dotenv').config({ path: '../.env.local' });  // Go one level up to the root
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
 const session = require('express-session');

// Initialize express app
const app = express();

// Initialize PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Load passport configuration after defining the pool
 
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(session({
  secret: 'some_secret_key',
  resave: false,
  saveUninitialized: true
}));

 

 

// Routes for authentication and events
require('./routes/auth')(app, pool);
require('./routes/events')(app, pool);

// Create tables if they don't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`).then(() => console.log("Users table is ready"))
  .catch(err => console.error('Error creating users table:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    frequency VARCHAR(50),
    calendar VARCHAR(50),
    CONSTRAINT unique_event_timeframe_per_day UNIQUE (user_id, start_time, end_time),
    CONSTRAINT end_after_or_is_start CHECK (end_time >= start_time)
  );
`).then(() => console.log("Events table is ready"))
  .catch(err => console.error('Error creating events table:', err));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
