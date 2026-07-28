import { rooms, playersInRooms } from "../index.js";

// Helper to determine player eliminated
export const determinePlayerEliminated = (roundData, ignorePlayer) => {
  // For each player, find their total score and have a chance to be eliminated based on score
  let highestChance = -Infinity;
  let playerEliminated = null;
  roundData.roundResults.forEach((result) => {
    // Ignore player if specified
    if (ignorePlayer && result.player.id === ignorePlayer.id) {
      return;
    }
    const score = result.score;
    // Higher score means lower chance of elimination
    const weight = 1 - score / 100;

    // Clamp weight to a minimum of 0.05 to give even high scorers a small chance of elimination
    const clampedWeight = Math.max(weight, 0.05);

    // Random chance with clamped weight
    const chance = Math.random() * clampedWeight;

    // check if this player has the highest chance of elimination so far
    if (chance > highestChance) {
      highestChance = chance;
      playerEliminated = result.player;
    }
  });

  return playerEliminated;
};

// Helper to eliminate player from room
export const eliminatePlayer = (io, code, roundData, playerEliminated) => {
  console.log(
    `Eliminating player ${playerEliminated.username} from room ${code}`,
  );
  const room = rooms[code];
  if (!room) {
    console.error(`Room ${code} not found`);
    return;
  }

  // Remove player from room
  room.players = room.players.filter(
    (p) => p.socketId !== playerEliminated.socketId,
  );
  // Remove from round data
  if (!roundData.eliminatedPlayers) {
    roundData.eliminatedPlayers = [];
  }
  roundData.eliminatedPlayers.push(playerEliminated);

  // Emit to player eliminated that they have been eliminated
  io.to(playerEliminated.socketId).emit("player-eliminated");

  // Remove player from socket room
  io.sockets.sockets.get(playerEliminated.socketId)?.leave(code);

  // Delete the player's gameData
  delete playerEliminated.gameData;

  // Remove player from playersInRooms
  delete playersInRooms[playerEliminated.socketId];
};
