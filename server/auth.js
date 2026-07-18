import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
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
  plugins: [username()],
  account: {
    accountLinking: {
      enable: true,
      allowDifferentEmails: true,
      disableImplicitLinking: true,
    },
  },
  socialProviders: {
    // Google
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    // GitHub
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    // Discord
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    },
  },
});

export default auth;
