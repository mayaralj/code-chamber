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

// Store players in rooms
const playersInRooms = {};

// BRoadcast rooms helper
const broadcastRooms = () => {
  const publicRooms = Object.values(rooms).filter(
    (room) => room.isPublic && !room.isGameStarted,
  );
  console.log("Broadcasting rooms list:", publicRooms);
  // Fill up public rooms for testing 30 rooms
  // while (publicRooms.length < 30) {
  //   publicRooms.push({
  //     code: `TEST${publicRooms.length + 1}`,
  //     roomName: `Test Room ${publicRooms.length + 1}`,
  //     host: { username: "TestHost" },
  //     players: [],
  //     maxPlayers: 5,
  //     isPublic: true,
  //     difficulty: "medium",
  //     isGameStarted: false,
  //   });
  // }
  io.emit("rooms-list", publicRooms);
};

// Room leave helper
const leaveRoom = (socket, code) => {
  const room = rooms[code];
  if (!room) {
    return;
  }
  // Remove player from room
  room.players = room.players.filter((player) => player.id !== socket.id);

  // Remove from room in socket.io and from playersInRooms mapping
  socket.leave(code);
  delete playersInRooms[socket.id];

  if (room.host.id === socket.id) {
    // Kick everyone when host leaves and delete room
    io.to(code).emit("host-left", { message: "Host left the room" });
    delete rooms[code];
    console.log(`Room ${code} deleted as host left`);
  } else {
    // Delete room if empty
    if (room.players.length === 0) {
      delete rooms[code];
      console.log(`Room ${code} deleted as it became empty`);
    } else {
      // Notify players in the room that someone left
      io.to(code).emit("player-left", { players: room.players });
    }
  }

  // Broadcast updated rooms list to all clients
  broadcastRooms();
};

// Socket.io logic
io.on("connection", (socket) => {
  // Print out userid that connected
  console.log("A user connected: " + socket.id);

  // Listen for room creation
  socket.on(
    "create-room",
    ({ username, roomName, maxPlayers, isPublic, difficulty }) => {
      // Create a random code
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();

      // Store new room in active rooms
      rooms[code] = {
        host: { id: socket.id, username },
        code,
        players: [{ id: socket.id, username }],
        roomName,
        maxPlayers,
        isPublic,
        difficulty,
        isGameStarted: false,
      };

      // Put the creator in the room
      socket.join(code);
      playersInRooms[socket.id] = code;

      // Emit back to the creator
      socket.emit("room-created", { roomInfo: rooms[code] });
      broadcastRooms();
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
    playersInRooms[socket.id] = code;

    // Emit back to the player that joined
    socket.emit("room-joined", {
      roomInfo: rooms[code],
    });
    // Emit to the rest of players inside that room
    socket.to(code).emit("player-joined", { players: room.players });
    // Broadcast updated rooms list to all clients
    broadcastRooms();
    console.log(`Player ${username} joined room ${code}`);
  });

  // Leave room event
  socket.on("leave-room", ({ code }) => {
    leaveRoom(socket, code);
  });

  // Start game event
  socket.on("start-game", ({ code }) => {
    const room = rooms[code];
    if (!room) {
      return;
    }
    room.isGameStarted = true;
    io.to(code).emit("game-started", { code, players: room.players });
    console.log(`Game started in room ${code}`);
  });

  // Listen for getting all rooms for public rooms page
  socket.on("get-rooms", () => {
    broadcastRooms();
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    leaveRoom(socket, playersInRooms[socket.id]);
    console.log("user disconnected: " + socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`SERVER STARTED ON PORT ${PORT}`);
});
