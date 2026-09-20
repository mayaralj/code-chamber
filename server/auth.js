import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { Kysely, PostgresDialect } from "kysely";
import pool from "./db.js";
import "dotenv/config";
import leaveRoom from "./room/leaveRoom.js";
import leaveGame from "./game/leaveGame.js";

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
    user: {},
  },
  trustedOrigins: [process.env.FRONTEND_URL],
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

  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        try {
          // Leave the room if the user is in one
          leaveRoom(user.id);
          // Leave the game if the user is in one
          leaveGame(user.id);
        } catch (error) {
          console.error("Error during user deletion cleanup:", error);
        }
      },
    },
  },

  advanced: {
    defaultCookieAttributes: {
      secure: true,
      sameSite: "none",
      partitioned: true,
    },
  },
});

export default auth;
