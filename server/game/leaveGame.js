// Imports
import { rooms, roomIdToCode, playersInRooms } from "../globals.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";
import { buildPlayerList } from "../utils/playerList.js";
import { trackMatch } from "../game/round/roundUtils.js";

// Game leave
const leaveGame = (io, socket, code) => {
  // Means just a regular disconnection
  if (!code) {
    return;
  }
  // Check if room is valid
  const room = rooms[code];
  if (!room) {
    console.log(
      `Socket ${socket.id} attempted to leave room in game: ${code} but it was not found`,
    );
    return;
  }

  // If not game started, let roomSockets handle it
  if (!room.isGameStarted) {
    return;
  }

  // Remove player from room
  // Ensure they exist in the room first (maybe eliminated)
  const player = room.players.find((p) => p.userId === socket.data.id);
  if (!player) {
    console.log(
      `Socket ${socket.id} attempted to leave room in game: ${code} but player was not found`,
    );
    return;
  }

  // Track match in db and flag them as lost
  trackMatch(player, room, false);

  // Flag player as eliminated and remove from room
  if (!room.roundData[room.currentRound || 1].eliminatedPlayers) {
    room.roundData[room.currentRound || 1].eliminatedPlayers = [];
  }
  room.roundData[room.currentRound || 1].eliminatedPlayers.push(player);
  room.players = room.players.filter((p) => p.userId !== socket.data.id);

  // Leave from socket room
  socket.leave(code);

  // Remove from fast lookup
  delete playersInRooms[socket.data.id];

  // Check if no players remaining
  if (room.players.length === 0) {
    broadcastRemoveRoom(io, code);
    delete roomIdToCode[room.roomId];
    delete rooms[code];
    console.log(`Room ${code} deleted as last player left`);
    return;
  }

  // Notify players in the room that someone left
  io.to(code).emit("player-left", { players: buildPlayerList(room) });

  // Check if all players have submitted after someone leaves or player is only one left
  if (
    room.players.every((p) => {
      const playerRoundData = p?.gameData?.roundData?.[room.currentRound];
      return playerRoundData?.submitted;
    }) ||
    room.players.length === 1
  ) {
    if (room.roundData[room.currentRound]?.cancelRoundTimer) {
      // Force end round
      room.roundData[room.currentRound].cancelRoundTimer();
    }
  }

  console.log(
    `User ${socket.data.username} left game room ${code}, ${room.players.length} players remaining`,
  );
};

export default leaveGame;
