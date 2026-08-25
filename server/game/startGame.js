// Imports
import beforeGame from "./beforeGame.js";
import startRound from "./round/round.js";
import { rooms } from "../globals.js";
import { broadcastUpdateRoom } from "../broadcast/broadcastRooms.js";
import db from "../db.js";

// Helper to track room in database (track now rather than earlier to reduce entries for rooms that never start)
const trackRoomInDatabase = async (roomId) => {
  try {
    await db.query(`INSERT INTO rooms (room_id) VALUES ($1)`, [roomId]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Start game
const startGame = async (io, socket, code) => {
  // Call beforeGame initialization
  await beforeGame(io, socket, code);

  // While loop to start rounds until game is over
  while (rooms[code] && rooms[code].players.length > 0) {
    await startRound(io, socket, code);
    console.log(`Round ${rooms[code]?.currentRound} completed in room ${code}`);
  }
};

// Handle start game (with all the checks and states)
const handleStartGame = async (io, socket, code) => {
  // Check if room is valid
  const room = rooms[code];
  if (!room) {
    return;
  }

  // Check if its the host
  if (room.host.socketId !== socket.id) {
    return;
  }

  // Check socket is connected
  if (!socket.connected) {
    return;
  }

  // Ensure game is not starting
  if (room.isGameStarting) {
    return;
  }

  // Ensure game has not already started
  if (room.isGameStarted) {
    return;
  }

  // Check if anyone is still reconnecting
  if (room.players.some((player) => player.isReconnecting)) {
    socket.emit("start-game-error", {
      message: "Waiting for a player to reconnect",
    });
    return;
  }

  // Check if more than 1 player
  if (room.players.length < 1) {
    socket.emit("start-game-error", {
      message: "Not enough players to start game",
    });
    return;
  }

  // Track room in database
  if (!(await trackRoomInDatabase(room.roomId)).success) {
    socket.emit("start-game-error", {
      message: "Failed to track room in database",
    });
    return;
  }

  room.isGameStarting = true;
  broadcastUpdateRoom(io, room);

  // Emit that game is starting
  io.to(code).emit("game-starting");

  // Update last activity timestamp
  room.lastActivity = Date.now();

  startGame(io, socket, code);
};

export default handleStartGame;
