// Imports
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const execFileAsync = promisify(execFile);

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get path to seed file
const seedPath = path.join(__dirname, "seed", "questionSeed.sql");

const seed = async () => {
  const seedId = "questionSeed.sql";
  const client = await db.connect();

  try {
    // Create a table that tracks all the seeds
    await client.query(`
      CREATE TABLE IF NOT EXISTS seed_data (
        id text PRIMARY KEY,
        seeded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Check if the seed has already been applied
    const result = await client.query("SELECT 1 FROM seed_data WHERE id = $1", [
      seedId,
    ]);

    if (result.rowCount > 0) {
      console.log(`Already seeded: ${seedId}`);
      return;
    }
  } finally {
    client.release();
  }

  console.log(`Applying seed: ${seedId}`);

  try {
    // Run the PostgreSQL dump using psql
    await execFileAsync("psql", [
      process.env.DB_URL,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      seedPath,
    ]);

    // Record the seed as completed
    const client = await db.connect();

    try {
      await client.query("INSERT INTO seed_data (id) VALUES ($1)", [seedId]);
    } finally {
      client.release();
    }

    console.log(`Seed applied: ${seedId}`);
  } catch (error) {
    console.error("Seeding failed:");
    console.error(error.stderr || error);
    process.exit(1);
  } finally {
    await db.end();
  }
};

seed();
