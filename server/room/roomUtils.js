// Imports
import { buildPlayerList } from "../utils/playerList.js";

// Helper to build player info relevant to room/game
export const buildPlayerInfo = (socket) => {
  const player = {
    userId: socket.data.id,
    socketId: socket.id,
    username: socket.data.username,
    displayName: socket.data.displayName,
    isGuest: socket.data.isGuest,
    isReconnecting: false,
    disconnectTimeout: null,
  };
  return player;
};

// Helper to build minimal room info
export const buildRoomInfo = (room) => {
  return {
    code: room.code,
    roomName: room.roomName,
    host: { username: room.host.username, displayName: room.host.displayName },
    players: buildPlayerList(room),
    maxPlayers: room.maxPlayers,
    isPublic: room.isPublic,
    difficulty: room.difficulty,
  };
};
