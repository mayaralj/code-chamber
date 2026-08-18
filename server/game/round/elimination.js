import { rooms, playersInRooms } from "../../globals.js";
import { trackMatch, trackSubmissionElimination } from "./roundUtils.js";

// Helper to determine player eliminated
export const determinePlayerEliminated = (roundData, ignorePlayer) => {
  // For each player, find their total score and have a chance to be eliminated based on score
  let highestChance = -Infinity;
  let playerEliminated = null;
  roundData.roundResults.forEach((result) => {
    // Ignore player if specified
    if (ignorePlayer && result.player.userId === ignorePlayer.userId) {
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
  if (!playerEliminated) {
    console.error(`No player to eliminate in room ${code}`);
    return;
  }
  console.log(
    `Eliminating player ${playerEliminated.username} from room ${code}`,
  );
  const room = rooms[code];
  if (!room) {
    console.error(`Room ${code} not found`);
    return;
  }

  // Calculate survival time
  const survivalTime = Math.round((Date.now() - room.gameStartedAt) / 1000);
  // Track match for eliminated player
  trackMatch(playerEliminated, room.roomId, false, survivalTime);

  // Remove player from room
  room.players = room.players.filter(
    (p) => p.userId !== playerEliminated.userId,
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
  delete playersInRooms[playerEliminated.userId];
};

// Helper to process round elims
export const processRoundElims = (io, code, roundData, roundEvents) => {
  // If more than 1 player left, determine player eliminated
  if (rooms[code].players.length > 1) {
    // Determine player eliminated (if more than 1 player left)
    const playerEliminated = determinePlayerEliminated(roundData);
    // If double elimination determine a second player eliminated
    if (
      roundEvents?.beforeRound?.doubleElimination &&
      rooms[code].players.length > 2
    ) {
      const secondPlayerEliminated = determinePlayerEliminated(
        roundData,
        playerEliminated,
      );
      // Eliminate second player
      eliminatePlayer(io, code, roundData, secondPlayerEliminated);
    }
    // Dont eliminate first player if missed bullet
    if (roundEvents?.afterRound?.missedBullet) {
      // Emit to all players in room
      io.to(code).emit("missed-player", {
        player: playerEliminated,
      });
      roundData.missedPlayer = playerEliminated;
    } else {
      // Eliminate player if bullet did not miss
      eliminatePlayer(io, code, roundData, playerEliminated);
    }
  }

  // This code can run even if only 1 player left (because disconnected players will be flagged as eliminated and this is used to track submission eliminations in db)

  // Store eliminated players ids for tracking submission eliminations (eliminated player will also store this)
  const eliminatedPlayersIds =
    roundData.eliminatedPlayers?.map((p) => p.userId) || [];
  console.log(
    `Round ${rooms[code].currentRound} in room ${code} eliminated players: ${eliminatedPlayersIds.join(
      ", ",
    )}`,
  );
  // track submission eliminations for each player in db
  Promise.all(
    roundData.roundResults.map((result) =>
      trackSubmissionElimination(result.submissionId, eliminatedPlayersIds),
    ),
  ).catch((err) => {
    console.error(
      `Error tracking submission eliminations for room ${code}:`,
      err,
    );
  });
};
