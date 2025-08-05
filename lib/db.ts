import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Test connection on startup
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Database connection error:", err);
});

// Database operation functions
export async function getUserWithAutomation(email: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM users WHERE email = $1 AND automation_enabled = true",
      [email]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function isEmailProcessed(emailId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id FROM processed_emails WHERE email_id = $1",
      [emailId]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

export async function markEmailAsProcessed(emailId: string, userId: number) {
  const client = await pool.connect();
  try {
    await client.query(
      "INSERT INTO processed_emails (email_id, user_id) VALUES ($1, $2)",
      [emailId, userId]
    );
  } finally {
    client.release();
  }
}

export async function updateUserAutomation(email: string, enabled: boolean) {
  const client = await pool.connect();
  try {
    await client.query(
      "UPDATE users SET automation_enabled = $1 WHERE email = $2",
      [enabled, email]
    );
  } finally {
    client.release();
  }
}

export async function getUserByGoogleId(googleId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM users WHERE google_id = $1",
      [googleId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function createUser(
  email: string,
  googleId: string,
  accessToken: string,
  refreshToken: string
) {
  const client = await pool.connect();
  try {
    await client.query(
      "INSERT INTO users (email, google_id, access_token, refresh_token) VALUES ($1, $2, $3, $4)",
      [email, googleId, accessToken, refreshToken]
    );
  } finally {
    client.release();
  }
}

export async function updateUserTokens(
  googleId: string,
  accessToken: string,
  refreshToken: string
) {
  const client = await pool.connect();
  try {
    await client.query(
      "UPDATE users SET access_token = $1, refresh_token = $2 WHERE google_id = $3",
      [accessToken, refreshToken, googleId]
    );
  } finally {
    client.release();
  }
}

export async function getUserByEmail(email: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, automation_enabled FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function setupDatabase() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        automation_enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create processed emails table
    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_emails (
        id SERIAL PRIMARY KEY,
        email_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
}

export default pool;
