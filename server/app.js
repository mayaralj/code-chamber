import express from "express";
import { toNodeHandler } from "better-auth/node";
import auth from "./auth.js";
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";
import profileRouter from "./routes/profile.js";
import cors from "cors";

export const createApp = (rooms) => {
  const app = express();
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());
  app.use("/api/questions", questionsRouter(rooms));
  app.use("/api/users", usersRouter);
  app.use("/api/profile", profileRouter());
  return app;
};
