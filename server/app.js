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

// Create app
export const createApp = () => {
  const app = express();
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());
  app.use("/api/profile", profileRouter());
  app.use("/api/leaderboard", leaderboardRouter());
  app.use("/api/health", serverHealthRouter());
  app.use("/api/matchHistory", matchHistoryRouter());
  app.use("/api/liveStats", liveStatsRouter());
  app.use("/api/homeLeaderboard", homeLeaderboardRouter());
  return app;
};
