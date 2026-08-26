// Imports
import { broadcastRooms } from "../broadcast/broadcastRooms.js";
import {
  handleReconnectRoom,
  startReconnectTimeout,
} from "../room/reconnectRoom.js";
import leaveRoom from "../room/leaveRoom.js";
import leaveGame from "../game/leaveGame.js";
import createRoom, { cancelRoomCreation } from "../room/createRoom.js";
import joinRoom from "../room/joinRoom.js";
import { checkPlayer } from "../room/checks.js";
import { rooms, playersInRooms } from "../globals.js";

// Handle room sockets
const setUpRoomSockets = (io, socket) => {
  // Listen for room creation
  socket.on("create-room", (roomData, callback) => {
    createRoom(io, socket, roomData, callback);
  });

  // Handle cancel room creation
  socket.on("cancel-room-creation", ({ roomId }) => {
    cancelRoomCreation(io, socket, roomId);
  });

  // Listen for on room join
  socket.on("join-room", ({ code }) => {
    joinRoom(io, socket, code);
  });

  // Rejoin room event
  socket.on("reconnect-room", ({ code }) => {
    handleReconnectRoom(io, socket, code);
  });

  // Leave room event
  socket.on("leave-room", ({ code }) => {
    leaveRoom(io, socket, code);
  });

  // Listen for getting all rooms for public rooms page
  socket.on("get-rooms", () => {
    broadcastRooms(io, socket);
  });

  // Validity checks
  socket.on("check-player", ({ code }) => {
    checkPlayer(socket, code);
  });

  // On public-rooms page
  socket.on("public-rooms", ({ onPage }) => {
    if (onPage) {
      socket.join("public-rooms");
      return;
    }
    socket.leave("public-rooms");
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    startReconnectTimeout(io, socket);
  });

  // Handle cleanup of player
  socket.on("cleanup-player", () => {
    // Point of this socket is to cleanup very rare race condition where a player creates or joins a room and the server flags them as disconnected but still creates the room anyways (because it queues for a few seconds for socket).

    // Find if they are in a room
    const code = playersInRooms[socket.data.id];
    if (!code) {
      return;
    }

    // Find room
    const room = rooms[code];
    if (!room) {
      return;
    }

    // Remove from room if not game started otherwise remove from game
    if (!room.isGameStarted) {
      leaveRoom(io, socket, code);
    } else {
      leaveGame(io, socket, code);
    }
  });
};

export default setUpRoomSockets;
