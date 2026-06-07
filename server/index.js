// Imports
import express from "express";
import { Server } from "socket.io";
import http from "http";

// Routes
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";

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

// Use the routes
app.use("/api/questions", questionsRouter);
app.use("/api/users", usersRouter);

// Store active rooms
const rooms = {};

// Socket.io logic
io.on("connection", (socket) => {
  // Print out userid that connected
  console.log("A user connected: " + socket.id);

  // Listen for room creation
  socket.on(
    "create-room",
    ({ username, lobbyName, maxPlayers, isPublic, difficulty }) => {
      // Create a random code
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();

      // Store new room in active rooms
      rooms[code] = {
        host: socket.id,
        code,
        players: [{ id: socket.id, username }],
        lobbyName,
        maxPlayers,
        isPublic,
        difficulty,
      };

      // Put the creator in the room
      socket.join(code);

      // Emit back to the creator
      socket.emit("room-created", { roomInfo: rooms[code] });
      console.log(`Room ${code} created by ${username}`);
    },
  );

  // Listen for on room join
  socket.on("join-room", ({ code, username }) => {
    // Check if room exists
    const room = rooms[code];
    if (!room) {
      socket.emit("room-join-error", { message: "Room not found" });
      return;
    }

    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      socket.emit("room-join-error", { message: "Room is full" });
      return;
    }

    // Push player to room
    room.players.push({ id: socket.id, username });

    // Put player in the room
    socket.join(code);

    // Emit back to the player that joined
    socket.emit("room-joined", {
      roomInfo: rooms[code],
    });
    // Emit to the rest of players inside that room
    socket.to(code).emit("player-joined", { players: room.players });
    console.log(`Player ${username} joined room ${code}`);
  });

  // Start game event
  socket.on("start-game", ({ code }) => {
    io.to(code).emit("game-started", code);
    console.log(`Game started in room ${code}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("user disconnected: " + socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`SERVER STARTED ON PORT ${PORT}`);
});
