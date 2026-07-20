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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create a profile_stats entry for the new user
          await pool.query(
            "INSERT INTO profile_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
            [user.id],
          );
          console.log("Profile stats entry created for user:", user.id);
        },
      },
    },
  },
  trustedOrigins: ["http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
  account: {
    accountLinking: {
      enabled: true,
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
