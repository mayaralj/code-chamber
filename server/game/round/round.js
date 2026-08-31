// Imports
import { sleep } from "../../utils/timers.js";
import { getPlayerCodeAll, forceSubmitAll } from "./submission.js";
import { processRoundElims } from "./elimination.js";
import { sendResults, gameOver, calculateAllScores } from "./results.js";
import { rooms } from "../../globals.js";
import {
  waitForReconnectingPlayers,
  buildReconnectData,
  firstRoundStart,
  otherRoundStart,
  startRoundTimer,
} from "./roundUtils.js";
import beforeRound from "./beforeRound.js";

// Config
// Timers (s)
const COUNTDOWN_TIMER = 5;
const ROUND_TIMER = 3000;
const WAIT_BEFORE_RESULTS = 5;
// Timeouts (ms)
const FORCE_SUBMIT_TIMEOUT = 50000;

// Start round
const startRound = async (io, socket, code) => {
  // Before Round
  const [curRound, roundData, roundEvents] = beforeRound(
    rooms[code],
    COUNTDOWN_TIMER,
  );

  // If this is the first round, emit game-started, else emit timer-tick and send-question
  if (curRound === 1) {
    firstRoundStart(io, code, roundData);
  } else {
    otherRoundStart(io, code, roundData, curRound);
  }

  // Wait for countdown
  await sleep(COUNTDOWN_TIMER * 1000);
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // Emit that timer is finished
  io.to(code).emit("timer-finished");

  // Start round timer
  await startRoundTimer(io, code, roundData, ROUND_TIMER);
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // Build reconnect data
  buildReconnectData(rooms[code], "round-timer-finished");

  // Emit that game timer is finished
  io.to(code).emit("round-timer-finished");

  // Disable manual submissions now, let the server handle force submissions
  roundData.submissionsAllowed = false;

  // If any players are reconnecting, wait for them to reconnect or timeout
  await waitForReconnectingPlayers(io, code);
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // Get all of the unsubmitted players so it can be processed for force submission
  const unsubmittedPlayersCode = await getPlayerCodeAll(
    io,
    code,
    roundData,
    curRound,
    FORCE_SUBMIT_TIMEOUT,
  );
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // If any players are reconnecting, wait for them to reconnect or timeout
  await waitForReconnectingPlayers(io, code);
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // Process all unsubmitted players
  if (unsubmittedPlayersCode.length > 0) {
    await forceSubmitAll(io, code, unsubmittedPlayersCode);
    // Check if room still exists
    if (!rooms[code]) {
      return;
    }
  }

  // If any players are reconnecting, wait for them to reconnect or timeout
  await waitForReconnectingPlayers(io, code);
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // Check for pending submissions and wait for them to finish (not from force submission, from manual that are still processing, rare to happen)
  if (roundData.pendingSubmissions?.size > 0) {
    await Promise.all(roundData.pendingSubmissions.values());
  }
  // Check room
  if (!rooms[code]) {
    return;
  }

  // If any players are reconnecting, wait for them to reconnect or timeout
  await waitForReconnectingPlayers(io, code);
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // Calculate all scores
  calculateAllScores(io, code, roundData);

  // Wait before sending results (so players can see their own personal results before the full results are sent)
  await sleep(WAIT_BEFORE_RESULTS * 1000);
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // Process round eliminations
  processRoundElims(io, code, roundData, roundEvents);

  // Check if 0 players are left (typically means disconnected)
  if (rooms[code].players.length === 0) {
    console.log(`Room ${code} has no players left, ending game`);
    await gameOver(io, code, roundData, null);
    return;
  }

  // Check if game is over (only one player left)
  if (rooms[code].players.length == 1) {
    console.log(
      `Game over in room ${code}, winner: ${rooms[code].players[0].username}`,
    );
    const winner = rooms[code].players[0];
    buildReconnectData(rooms[code], "results");
    await gameOver(io, code, roundData, winner);
    // Game is over, return
    return;
  }

  // Send results (more rounds to go)
  buildReconnectData(rooms[code], "results");
  await sendResults(io, code, roundData);
  // Check if room still exists
  if (!rooms[code]) {
    return;
  }
};

export default startRound;
