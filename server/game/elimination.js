// Helper to determine player eliminated
export const determinePlayerEliminated = (roundData) => {
  // For each player, find their total score and have a chance to be eliminated based on score
  let highestChance = -Infinity;
  let playerEliminated = null;
  roundData.roundResults.forEach((result) => {
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

  roundData.playerEliminated = playerEliminated;
};

// Helper to eliminate player from room
export const eliminatePlayer = (io, room, code, roundData) => {
  console.log(
    `Eliminating player ${roundData.playerEliminated.username} from room ${code}`,
  );

  // Remove player from room
  room.players = room.players.filter(
    (p) => p.id !== roundData.playerEliminated.id,
  );
  // Emit to player eliminated that they have been eliminated
  io.to(roundData.playerEliminated.id).emit("player-eliminated");

  // Remove player from socket room
  io.sockets.sockets.get(roundData.playerEliminated.id)?.leave(code);
};
