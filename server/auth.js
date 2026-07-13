import { betterAuth } from "better-auth";
import { Kysely, PostgresDialect } from "kysely";
import pool from "./db.js";
import "dotenv/config";

// Initialize Kysely with Postgres dialect and connection pool
const db = new Kysely({
  dialect: new PostgresDialect({ pool }),
});

// Initialize Better Auth with Kysely database and email/password authentication
const auth = betterAuth({
  database: {
    db,
    type: "postgres",
  },

  trustedOrigins: ["http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
  },
});

export default auth;
