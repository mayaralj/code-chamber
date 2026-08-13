import { Pool, types } from "pg";

// Override the default parsing of numeric types to return them as JavaScript numbers instead of strings
types.setTypeParser(1700, (value) => parseFloat(value));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export default pool;
