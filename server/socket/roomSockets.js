// Imports
import { broadcastRooms } from "../broadcast/broadcastRooms.js";
import {
  handleReconnectRoom,
  startReconnectTimeout,
} from "../room/reconnectRoom.js";
import leaveRoom from "../room/leaveRoom.js";
import createRoom, { cancelRoomCreation } from "../room/createRoom.js";
import joinRoom from "../room/joinRoom.js";
import { checkPlayer } from "../room/checks.js";

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
};

export default setUpRoomSockets;
