// Imports
import express from "express";
import { Server } from "socket.io";
import http from "http";

// Routes
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";

// Socket
import initSocket from "./socket/socket.js";

// Container pool
import { startPool, stopPool } from "./executor/containerPool.js";

// Auth
import { toNodeHandler } from "better-auth/node";
import auth from "./auth.js";

// Database
import db from "./db.js";
// db.query("SELECT NOW()", (err, res) => {
//   if (err) {
//     console.error("Database connection failed:", err);
//   } else {
//     console.log("Database connected at:", res.rows[0]);
//   }
// });

// Port
const PORT = process.env.PORT || 5000;

// Define app
const app = express();
// Use auth for all /api/auth/* routes
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

// Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

// Store active rooms
const rooms = {};

// Store players in rooms
const playersInRooms = {};

// Use the routes
app.use("/api/questions", questionsRouter(rooms));
app.use("/api/users", usersRouter);

// Queries
const startup = async () => {
  try {
    // List out all of the queries
    const queries = {
      //questions: "SELECT * FROM questions",
    };

    // Run all of the queries
    const keys = Object.keys(queries);
    const results = await Promise.all(
      keys.map((key) => db.query(queries[key])),
    );

    // Store the results in a data object
    const data = Object.fromEntries(
      keys.map((key, index) => [key, results[index].rows]),
    );

    console.log("All queries executed successfully");

    // Start the container pool
    await startPool();

    // Socket initialization
    initSocket(io, { rooms, playersInRooms, ...data });

    // Start the server
    server.listen(PORT, () => {
      console.log(`SERVER STARTED ON PORT ${PORT}`);
    });
  } catch (err) {
    // Exit server on error
    console.error("Failed to execute queries:", err);
    process.exit(1);
  }
};

startup();

// On shutdown, cleanup
const onShutdown = async (signal) => {
  console.log(`---SHUTTING DOWN SERVER (${signal})---`);
  try {
    // Stop pool and clean up containers
    await stopPool();
  } catch (error) {
    console.error("Error during pool shutdown:", error);
  } finally {
    console.log("SERVER HAS BEEN SHUTDOWN");
    process.exit(0);
  }
};

// Handle shutdown signals
process.on("SIGINT", async () => {
  process.exitCode = 0;
  await onShutdown("SIGINT");
});
process.on("SIGTERM", async () => {
  process.exitCode = 0;
  await onShutdown("SIGTERM");
});
