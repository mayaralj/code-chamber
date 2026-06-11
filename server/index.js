// Imports
import express from "express";
import { Server } from "socket.io";
import http from "http";

// Routes
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";

// Socket
import initSocket from "./socket/index.js";

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

// Use the routes
app.use("/api/questions", questionsRouter(rooms));
app.use("/api/users", usersRouter);

// Socket initialization
initSocket(io, { rooms, playersInRooms });

// Start the server
server.listen(PORT, () => {
  console.log(`SERVER STARTED ON PORT ${PORT}`);
});
