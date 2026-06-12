// Imports
import express from "express";
import { Server } from "socket.io";
import http from "http";

// Routes
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";

// Socket
import initSocket from "./socket/socket.js";

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
app.use(express.json());

// Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Store active rooms
const rooms = {};

// Store players in rooms
const playersInRooms = {};

// Grab questions from database
db.query("SELECT * FROM questions", (err, res) => {
  // Handle error
  if (err) {
    console.error("Failed to fetch questions from database:", err);

    // Exit server
    process.exit(1);
  }

  // Get the questions
  const questions = res.rows;
  console.log(`Fetched ${questions.length} questions from database}`);

  // Socket initialization
  initSocket(io, { rooms, playersInRooms, questions });
});

// Use the routes
app.use("/api/questions", questionsRouter(rooms));
app.use("/api/users", usersRouter);

// Start the server
server.listen(PORT, () => {
  console.log(`SERVER STARTED ON PORT ${PORT}`);
});
