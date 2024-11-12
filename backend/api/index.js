const path = require("path");
require('dotenv').config({ path: path.join(__dirname,"../.env") });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const expressSession = require('express-session');
const pgSession = require('connect-pg-simple')(expressSession);
const jwt = require('jsonwebtoken'); 
const cookieParser = require('cookie-parser');
const handleGoogleCalendarWebhook = require('./routes/webhook');

// Initialize express app
const app = express();

app.use(cookieParser())

// Initialize PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Load passport configuration after defining the pool
require('./config/passport')(pool);

app.use(express.json());
app.use(cors({
  origin: ['https://timewise-ashy.vercel.app/', "http://localhost:3000"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Set up session management
  app.use(
    expressSession({
      store: new pgSession({
        pool: pool,
        tableName: "userSessions"
      }),
      secret: process.env.COOKIE_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: { maxAge: 30*24*60*60*1000}
    })
  );


// Routes for authentication and events
require('./routes/auth')(app, pool);
require('./routes/events')(app, pool);
require('./routes/profile')(app, pool);
require('./routes/servers')(app, pool);

pool.query('CREATE EXTENSION IF NOT EXISTS vector;')
	.then(() => {console.log("Vector extension ready")})
	.catch(err => {console.error('Error creating vector extension: ', err)});

// Create or alter users table to add 2FA columns
pool.query(`  
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT,  -- Set password to allow NULL for OAuth users
    profile_image VARCHAR(255),
    access_token TEXT,
    sync_token VARCHAR(255),
    refresh_token TEXT,
    dark_mode BOOLEAN DEFAULT false, -- dark mode preference
    preferences JSONB DEFAULT '{}',  -- Store event preferences (visibility and colors)
    two_factor_code VARCHAR(6),
    two_factor_expires TIMESTAMPTZ
  );
  
  CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    image_url VARCHAR(255),
    created_by INT REFERENCES users(id) ON DELETE CASCADE,
    invite_link VARCHAR(255) UNIQUE 

  );

  CREATE TABLE IF NOT EXISTS user_servers (
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      server_id INT REFERENCES servers(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, server_id)
  );
`).then(() => {
  console.log("Users table is ready");
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
      time_zone VARCHAR(50),
      server_id INT REFERENCES servers(id) ON DELETE CASCADE,

      completed BOOLEAN,
      include_in_personal BOOLEAN DEFAULT FALSE,
      CONSTRAINT end_after_or_is_start CHECK (end_time >= start_time)
    );
      ALTER TABLE events ADD COLUMN IF NOT EXISTS server_id INT REFERENCES servers(id) ON DELETE CASCADE;
      ALTER TABLE events DROP CONSTRAINT IF EXISTS unique_event_timeframe_per_day;
      ALTER TABLE servers ADD COLUMN IF NOT EXISTS invite_link VARCHAR(255) UNIQUE;
  `).then(() => console.log("Events table is ready"))
    .catch(err => console.error('Error creating events table:', err));
  }).catch(err => console.error('Error creating users table:', err));

  pool.query(`
    CREATE TABLE IF NOT EXISTS "userSessions" (
    sid VARCHAR NOT NULL COLLATE "default",
    sess json NOT NULL,
    expire timestamp(6) NOT NULL,
    token VARCHAR(200),
    CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
    )
    WITH (OIDS=FALSE);

    CREATE INDEX IF NOT EXISTS IDX_session_expire ON "userSessions" (expire);`).then(() => console.log("Sessions table is ready")
    ).catch(err => console.error("Error creating sessions table:", err));

// Additional routes
require('./routes/auth')(app, pool);
require('./routes/events')(app, pool);
require('./routes/ai')(app, pool);
app.post('/webhook/google-calendar', handleGoogleCalendarWebhook(pool));

app.get('/', async (req, res) => {
  res.send({ "status": "ready" });
});

// Start the server
const PORT = process.env.PORT || 5000;
console.log("Server is running")

module.exports = app;