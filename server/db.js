// Imports
import dotenv from "dotenv";
dotenv.config();
import { Pool, types } from "pg";

// Override the default parsing of numeric types to return them as JavaScript numbers instead of strings
types.setTypeParser(1700, (value) => parseFloat(value));

// Create a new PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DB_URL,

  // Timeouts
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  query_timeout: 30000,
  idleTimeoutMillis: 30000,
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export default pool;
