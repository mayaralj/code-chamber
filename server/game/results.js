// Imports
import { sleep } from "../utils/timers.js";
import { buildPlayerList } from "../utils/playerList.js";
import deleteRoom from "../room/deleteRoom.js";

// CONFIG
const RESULTS_TIMER = 10;
const GAME_OVER_TIMER = 5;

// Send results
export const sendResults = async (io, room, code, roundData) => {
  // Check if player eliminated exists, if not, set to N/A
  if (!roundData.playerEliminated) {
    console.log(`No player eliminated in room ${code}, sending results`);
    // Check if missed player exists, if so, set to that player
    roundData.playerEliminated = { username: "No One" };
  }
  roundData.resultsEndsAt = Date.now() + 1000 * RESULTS_TIMER;
  console.log(
    `Sending results for room ${code}, player eliminated: ${roundData.playerEliminated.username}`,
  );
  io.to(code).emit("send-results", {
    results: roundData.roundResults,
    resultsEndsAt: roundData.resultsEndsAt,
    playerEliminated: roundData.playerEliminated.username,
    players: buildPlayerList(room),
    // if missed bullet also send that
    missedPlayer: roundData.missedPlayer?.username || null,
  });

  // Sleep for results timer duration
  await sleep(RESULTS_TIMER * 1000);

  // Emit that results timer is finished
  io.to(code).emit("results-timer-finished");
};

// Game over helper
export const gameOver = async (io, rooms, code, roundData, winner) => {
  // Check if player eliminated exists, if not, set to N/A
  if (!roundData.playerEliminated) {
    console.log(`No player eliminated in room ${code}, sending results`);
    roundData.playerEliminated = { username: "N/A" };
  }
  const gameOverEndsAt = Date.now() + 1000 * GAME_OVER_TIMER;
  io.to(code).emit("game-over", {
    results: roundData.roundResults,
    gameOverEndsAt,
    playerEliminated: roundData.playerEliminated.username,
    winner: winner?.username,
  });

  // Sleep for game over timer duration
  await sleep(GAME_OVER_TIMER * 1000);

  // Emit that room is deleted
  io.to(code).emit("room-deleted");

  // Delete room
  console.log(`Game over in room ${code}, deleting room`);
  deleteRoom(io, rooms, code);
};
