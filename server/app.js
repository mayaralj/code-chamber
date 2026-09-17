// Imports
import express from "express";
import { toNodeHandler } from "better-auth/node";
import auth from "./auth.js";
import profileRouter from "./routes/profile.js";
import leaderboardRouter from "./routes/leaderboard.js";
import homeLeaderboardRouter from "./routes/homeLeaderboard.js";
import serverHealthRouter from "./routes/serverHealth.js";
import matchHistoryRouter from "./routes/matchHistory.js";
import liveStatsRouter from "./routes/liveStats.js";
import cors from "cors";
import {
  globalLimiter,
  authLimiter,
  profileLimiter,
  leaderboardLimiter,
  matchHistoryLimiter,
  liveStatsLimiter,
  healthLimiter,
} from "./middleware/rateLimiters.js";

// Create app
export const createApp = () => {
  // Create express app
  const app = express();

  // Set up proxy
  app.set("trust proxy", 1);

  // cors
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));

  // Use the globally applied rate limiter
  app.use(globalLimiter);

  // Auth limiter
  app.use("/api/auth", authLimiter);
  app.all("/api/auth/*splat", toNodeHandler(auth));

  // express json middleware
  app.use(express.json());

  // Rest of the API routes with their respective rate limiters
  app.use("/api/profile", profileLimiter, profileRouter());
  app.use("/api/leaderboard", leaderboardLimiter, leaderboardRouter());
  app.use("/api/health", healthLimiter, serverHealthRouter());
  app.use("/api/matchHistory", matchHistoryLimiter, matchHistoryRouter());
  app.use("/api/liveStats", liveStatsLimiter, liveStatsRouter());
  app.use("/api/homeLeaderboard", leaderboardLimiter, homeLeaderboardRouter());
  return app;
};
