import express from "express";
import { toNodeHandler } from "better-auth/node";
import auth from "./auth.js";
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";

export const createApp = (rooms) => {
  const app = express();
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());
  app.use("/api/questions", questionsRouter(rooms));
  app.use("/api/users", usersRouter);
  return app;
};
