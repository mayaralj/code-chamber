// Imports
import { sleep } from "../../utils/timers.js";
import { buildPlayerList } from "../../utils/playerList.js";
import deleteRoom from "../../room/deleteRoom.js";
import db from "../../db.js";
import { rooms, playersInRooms } from "../../globals.js";

// CONFIG
const RESULTS_TIMER = 10;
const GAME_OVER_TIMER = 5;

// Helper to calculate score based on results
export const calculateScore = (result, averageExecutionTime) => {
  let { passed, testCasesPassed, executionTime, submitTime } = result;

  // Ratio of test cases passed
  const testCaseRatio = testCasesPassed / result.numOfTestCases;

  // Track score
  let score = 0;

  // Score is based on test cases passed, execution time, and submission time
  score += passed ? 60 : 0;
  score += testCaseRatio * 50;
  // If execution time is less than average, give bonus points
  // Ensure execution time exists (if code execution errored, it will not exist)
  if (averageExecutionTime && executionTime) {
    score += (averageExecutionTime - executionTime) * 5;
  }
  score -= submitTime;

  // Clamp score to a minimum of 0
  score = Math.max(0, Math.round(score));

  // Clamp score to a maximum of 100
  score = Math.min(100, score);

  // Ceil the score to the nearest integer
  score = Math.ceil(score);

  return score;
};

// Calculate scores
export const calculateAllScores = (io, code, roundData) => {
  // Calculate scores for all players
  if (roundData.roundResults) {
    roundData.roundResults.forEach((result) => {
      result.score = calculateScore(
        result,
        roundData.averageExecutionTime[result.languageUsed],
      );
    });
  }
};

// Send results
export const sendResults = async (io, code, roundData) => {
  const room = rooms[code];
  if (!room) {
    console.error(`Room ${code} not found for sending results`);
    return;
  }

  // Calculate results ends at
  roundData.resultsEndsAt = Date.now() + 1000 * RESULTS_TIMER;
  // Send results to players in room
  io.to(code).emit("send-results", {
    results: roundData.roundResults,
    resultsEndsAt: roundData.resultsEndsAt,
    eliminatedPlayers:
      roundData?.eliminatedPlayers?.map((p) => p.username) || [],
    players: buildPlayerList(room),
    // if missed bullet also send that
    missedPlayer: roundData.missedPlayer?.username || null,
  });

  // Sleep for results timer duration
  await sleep(RESULTS_TIMER * 1000);

  // Emit that results timer is finished
  io.to(code).emit("results-timer-finished");
};

// Helper to update matches_won for winner
const updateWinnerMatchesWon = async (winner) => {
  // If no winner, or guest
  if (!winner || !winner.userId || winner.isGuest) {
    console.log("No winner to update matches_won for");
    return;
  }

  try {
    // Update matches_won for winner in database
    await db.query(
      `UPDATE profile_stats
      SET matches_won = matches_won + 1,
          updated_at = NOW()
      WHERE user_id = $1`,
      [winner.userId],
    );
    console.log(`Updated matches_won for winner ${winner.username}`);
  } catch (error) {
    console.error(
      `Error updating matches_won for winner ${winner.username}:`,
      error,
    );
  }
};

// Game over helper
export const gameOver = async (io, code, roundData, winner) => {
  // Update matches_won for winner
  updateWinnerMatchesWon(winner);

  // Send game over data
  const gameOverEndsAt = Date.now() + 1000 * GAME_OVER_TIMER;
  io.to(code).emit("game-over", {
    results: roundData.roundResults,
    gameOverEndsAt,
    eliminatedPlayers:
      roundData.eliminatedPlayers?.map((p) => p.username) || [],
    winner: winner?.username,
  });

  // Sleep for game over timer duration
  await sleep(GAME_OVER_TIMER * 1000);

  // Check if room still exists before deleting
  if (!rooms[code]) {
    return;
  }

  // Emit that room is deleted
  io.to(code).emit("room-deleted");

  // Remove all players from mapping and socket rooms and delete the room
  rooms[code].players.forEach((player) => {
    delete playersInRooms[player.userId];
    io.sockets.sockets.get(player.socketId)?.leave(code);
  });

  // Delete room
  console.log(`Game over in room ${code}, deleting room`);
  deleteRoom(io, rooms, code);
};
