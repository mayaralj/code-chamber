// Imports
import { rooms, playersInRooms } from "../globals.js";
import { buildPlayerInfo } from "./roomUtils.js";
import { buildPlayerList } from "../utils/playerList.js";
import leaveRoom from "./leaveRoom.js";
import reconnectGame from "../game/reconnectGame.js";
import { buildRoomInfo } from "./roomUtils.js";

// Config
const RECONNECT_TIMEOUT = 30000;

// Helper to handle the reconnect timeout for a player
export const startReconnectTimeout = (io, socket) => {
  // Get room
  const code = playersInRooms[socket.data.id];
  if (!code) {
    return;
  }
  const room = rooms[code];
  if (!room) {
    return;
  }

  // Ignore if game started, let gameSockets handle it
  if (room.isGameStarted) {
    return;
  }

  // Find exact player in room
  const player = room.players.find((p) => p.socketId === socket.id);
  if (!player) {
    return;
  }

  // Clear if previously reconnecting
  if (player.disconnectTimeout) {
    clearTimeout(player.disconnectTimeout);
    player.disconnectTimeout = null;
  }

  // Mark player as reconnecting
  player.isReconnecting = true;

  // Notify all players in the room that this player is reconnecting
  io.to(code).emit("player-reconnecting", {
    players: buildPlayerList(room),
  });

  // Set a timeout to remove the player if they don't reconnect in time
  player.disconnectTimeout = setTimeout(() => {
    leaveRoom(io, socket, code);
  }, RECONNECT_TIMEOUT);
};

const reconnectRoom = (socket, code, existingPlayer) => {
  // Check room (should always exist due to prev checks from caller)
  const room = rooms[code];

  // Handle reconnection
  // Clear timeout
  console.log(`Player ${existingPlayer.username} rejoined room ${code}`);
  clearTimeout(existingPlayer.disconnectTimeout);
  existingPlayer.disconnectTimeout = null;
  // Mark player as reconnected
  existingPlayer.isReconnecting = false;

  // Update socket id
  existingPlayer.socketId = socket.id;

  // If host updated, update host info
  if (room.host.userId === socket.data.id) {
    room.host = buildPlayerInfo(socket);
  }

  // Put player in the room
  socket.join(code);
  playersInRooms[socket.data.id] = code;

  return;
};

export const handleReconnectRoom = (io, socket, code) => {
  // Get username from socket data
  const username = socket.data.username;
  if (!username) {
    socket.emit("room-reconnect-error");
    return;
  }
  const room = rooms[code];
  if (!room) {
    socket.emit("room-reconnect-error");
    return;
  }

  // Find player in room
  const existingPlayer = room.players.find((p) => p.userId === socket.data.id);
  if (!existingPlayer || !existingPlayer.isReconnecting) {
    socket.emit("room-reconnect-error");
    return;
  }

  // Check if game has started, if so, call reconnectGame to handle the reconnection
  if (room.isGameStarted) {
    reconnectGame(io, socket, code);
    return;
  }

  // Handle rejoin
  reconnectRoom(socket, code, existingPlayer);
  // Emit back to the player that rejoined
  socket.emit("room-reconnected", {
    roomInfo: buildRoomInfo(room),
  });

  // Emit to the rest of players inside that room
  socket.to(code).emit("player-reconnected", {
    roomInfo: buildRoomInfo(room),
  });
};

export default reconnectRoom;
