import express from "express";
import { toNodeHandler } from "better-auth/node";
import auth from "./auth.js";
import profileRouter from "./routes/profile.js";
import leaderboardRouter from "./routes/leaderboard.js";
import cors from "cors";

export const createApp = () => {
  const app = express();
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());
  app.use("/api/profile", profileRouter());
  app.use("/api/leaderboard", leaderboardRouter());
  return app;
};
