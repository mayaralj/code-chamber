// Imports
import { sleep } from "../../utils/timers.js";
import { buildPlayerList } from "../../utils/playerList.js";
import deleteRoom from "../../room/deleteRoom.js";
import { rooms } from "../../globals.js";
import { trackMatch } from "./roundUtils.js";

// CONFIG
const RESULTS_TIMER = 10 * 1000;
const GAME_OVER_TIMER = 5 * 1000;

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
  await sleep(RESULTS_TIMER);

  // Emit that results timer is finished
  io.to(code).emit("results-timer-finished");
};

// Game over helper
export const gameOver = async (io, code, roundData, winner) => {
  // Track match for winner
  if (winner) {
    const survivalTime = Math.round(
      (Date.now() - rooms[code].gameStartedAt) / 1000,
    );
    trackMatch(winner, rooms[code].roomId, true, survivalTime);
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
    await sleep(GAME_OVER_TIMER);

    // Check if room still exists before deleting
    if (!rooms[code]) {
      return;
    }
  }

  // Delete room
  console.log(`Game over in room ${code}, deleting room`);
  deleteRoom(io, code, "Game over");
};
