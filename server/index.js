// Imports
import express from "express";

// Routes
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";

// Port
const PORT = process.env.PORT || 5000;

// Define app
const app = express();
app.use(express.json());

// Use the routes
app.use("/api/questions", questionsRouter);
app.use("/api/users", usersRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`SERVER STARTED ON PORT ${PORT}`);
});
