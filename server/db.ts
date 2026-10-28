import pg from "pg";
import { emailLookupHash, encryptPrivateText } from "./data-encryption.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      email_hash TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      trial_ends_at TIMESTAMPTZ NOT NULL,
      subscription_status TEXT,
      stripe_customer_id TEXT,
      paypal_subscription_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS conversations_user_created_idx
      ON conversations(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
      ON messages(conversation_id, created_at);
  `);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: users } = await client.query(
      "SELECT id, email FROM users WHERE email_hash IS NULL FOR UPDATE",
    );
    for (const user of users) {
      await client.query(
        "UPDATE users SET email = $2, email_hash = $3 WHERE id = $1",
        [user.id, encryptPrivateText(user.email), emailLookupHash(user.email)],
      );
    }

    const { rows: messages } = await client.query(
      "SELECT id, content FROM messages WHERE content NOT LIKE 'enc:v1:%' FOR UPDATE",
    );
    for (const message of messages) {
      await client.query(
        "UPDATE messages SET content = $2 WHERE id = $1",
        [message.id, encryptPrivateText(message.content)],
      );
    }

    const { rows: conversations } = await client.query(
      "SELECT id, title FROM conversations WHERE title NOT LIKE 'enc:v1:%' FOR UPDATE",
    );
    for (const conversation of conversations) {
      await client.query(
        "UPDATE conversations SET title = $2 WHERE id = $1",
        [conversation.id, encryptPrivateText(conversation.title)],
      );
    }
    await client.query("ALTER TABLE users ALTER COLUMN email_hash SET NOT NULL");
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_email_hash_idx ON users(email_hash)",
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
