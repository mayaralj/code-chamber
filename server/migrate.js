// Imports
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get path to migrations folder
const migrationsPath = path.join(__dirname, "migrations");

const migrate = async () => {
  const client = await db.connect();
  try {
    // Create a table that will track all the migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Get all the files in the migrations folder
    const files = fs
      .readdirSync(migrationsPath)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // Apply the migrations
    for (const file of files) {
      // CHeck if already in schema_migrations table
      const result = await client.query(
        "SELECT 1 FROM schema_migrations WHERE id = $1",
        [file],
      );

      if (result.rowCount > 0) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      // Read the migration SQL
      const sql = fs.readFileSync(path.join(migrationsPath, file), "utf8");

      console.log(`Applying: ${file}`);

      try {
        // Apply migration and record it as completed
        await client.query("BEGIN");

        await client.query(sql);

        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
          file,
        ]);

        await client.query("COMMIT");

        console.log(`Applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Migrations complete.");
  } finally {
    client.release();
    await db.end();
  }
};

migrate().catch((error) => {
  console.error("Migration failed:");
  console.error(error);
  process.exit(1);
});
