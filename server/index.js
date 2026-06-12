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

// Questions (keeping them hardcoded for now)
const questions = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
  },
  {
    id: 2,
    title: "Three Sum",
    difficulty: "Medium",
    description:
      "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. The solution set must not contain duplicate triplets.",
  },
  {
    id: 3,
    title: "Four Sum",
    difficulty: "Hard",
    description:
      "Given an array of n integers nums and an integer target, are there elements a, b, c, and d in nums such that a + b + c + d == target? Find all unique quadruplets in the array which gives the sum of target. The solution set must not contain duplicate quadruplets.",
  },
];

// Use the routes
app.use("/api/questions", questionsRouter(rooms));
app.use("/api/users", usersRouter);

// Socket initialization
initSocket(io, { rooms, playersInRooms, questions });

// Start the server
server.listen(PORT, () => {
  console.log(`SERVER STARTED ON PORT ${PORT}`);
});
