import getQuestion from "../socket/questionSockets.js";
import db from "../db.js";
import { sleep, cancellableSleep } from "../utils/timers.js";
import {
  notifySubmission,
  processSubmission,
  forceSubmitPlayer,
} from "./submission.js";

// Config
// Timers (s)
const COUNTDOWN_TIMER = 5;
const GAME_OVER_TIMER = 5;
const ROUND_TIMER = 30;
const RESULTS_TIMER = 10;
// Timeouts (ms)
const FORCE_SUBMIT_TIMEOUT = 5000;
const ELIMINATE_TIMEOUT = 5000;

// Helper to determine player eliminated
const determinePlayerEliminated = (room, results) => {
  // For each player, find their total score and have a chance to be eliminated based on score
  let highestChance = -Infinity;
  let playerEliminated = null;
  results.forEach(({ player, result }) => {
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
      playerEliminated = player;
    }
  });

  return playerEliminated;
};

// Helper to eliminate player from room
export const eliminatePlayer = (io, room, code, playerEliminated) => {
  console.log(`Eliminating player ${playerEliminated} from room ${code}`);

  // Remove player from room
  room.players = room.players.filter((p) => p.id !== playerEliminated.id);
  // Emit to player eliminated that they have been eliminated
  io.to(playerEliminated.id).emit("player-eliminated");

  // Remove player from socket room
  io.sockets.sockets.get(playerEliminated.id)?.leave(code);
};

// Send results
const sendResults = async (io, room, code, playerEliminated) => {
  // Check if player eliminated exists, if not, set to N/A
  if (!playerEliminated) {
    console.log(`No player eliminated in room ${code}, sending results`);
    playerEliminated = { username: "N/A" };
  }
  const resultsEndsAt = Date.now() + 1000 * RESULTS_TIMER;
  console.log(
    `Sending results for room ${code}, player eliminated: ${playerEliminated.username}`,
  );
  io.to(code).emit("send-results", {
    results: room.roundResults,
    resultsEndsAt,
    playerEliminated: playerEliminated.username,
    players: room.players,
  });

  // Sleep for results timer duration
  await sleep(RESULTS_TIMER * 1000);

  // Emit that results timer is finished
  io.to(code).emit("results-timer-finished");
};

// Game over helper
const gameOver = async (io, rooms, code, playerEliminated, winner) => {
  // Check if player eliminated exists, if not, set to N/A
  if (!playerEliminated) {
    console.log(`No player eliminated in room ${code}, sending results`);
    playerEliminated = { username: "N/A" };
  }
  const gameOverEndsAt = Date.now() + 1000 * GAME_OVER_TIMER;
  io.to(code).emit("game-over", {
    results: rooms[code].roundResults,
    gameOverEndsAt,
    playerEliminated: playerEliminated.username,
    winner: winner?.username,
  });

  // Sleep for game over timer duration
  await sleep(GAME_OVER_TIMER * 1000);

  // Emit that room is deleted
  io.to(code).emit("room-deleted");

  // Delete room
  delete rooms[code];
  io.in(code).socketsLeave(code);
  console.log(`Room ${code} deleted as game is over`);
};

// Start game event
const startRound = async (io, socket, code, rooms, pendingCodeRequests) => {
  // Check if room exists
  if (!rooms[code]) {
    io.to(code).emit("room-deleted");
    io.in(code).socketsLeave(code);
    return;
  }

  // Increment current round
  rooms[code].currentRound += 1;

  // Begin initial countdown
  const endsAt = Date.now() + 1000 * COUNTDOWN_TIMER;

  // If its the first round emit game started, otherwise just emit timer tick
  const randomQuestion = getQuestion(
    io,
    code,
    rooms[code],
    rooms[code].questions,
  );
  // Remove the question from the list of questions for the room
  // rooms[code].questions = rooms[code].questions.filter(
  //   (q) => q.id !== randomQuestion.id,
  // );

  // Get the starter code for the question
  const { rows } = await db.query(
    "SELECT language, code FROM starter_code WHERE question_id = $1",
    [randomQuestion.id],
  );
  randomQuestion.starterCode = rows;
  if (rooms[code].currentRound === 1) {
    console.log(`Current round is 1, emitting game-started for room ${code}`);
    io.to(code).emit("game-started", {
      code,
      serverPlayers: rooms[code].players,
      endsAt,
      question: randomQuestion,
    });
  } else {
    console.log(
      `New EndsAt for room ${code}: ${endsAt}, emitting timer-tick and send-question`,
    );
    io.to(code).emit("timer-tick", { newEndsAt: endsAt });
    console.log(`Emitting send-question for room ${code}`);
    io.to(code).emit("send-question", { question: randomQuestion });
  }

  // Wait for countdown to finish before sending question
  await sleep(COUNTDOWN_TIMER * 1000);
  if (!rooms[code]) {
    io.to(code).emit("room-deleted");
    io.in(code).socketsLeave(code);
    return;
  }

  // Emit that timer is finished
  io.to(code).emit("timer-finished");

  // Start game timer
  const roundTimerEndsAt = Date.now() + 1000 * ROUND_TIMER;
  io.to(code).emit("round-tick", { roundTimerEndsAt });

  // Save start round time
  rooms[code].roundStartTime = Date.now();

  // Store current round results
  rooms[code].roundResults = [];

  // Create a new promise and cancel function for the round timer
  const { promise: roundTimerPromise, cancel: cancelRoundTimer } =
    cancellableSleep(ROUND_TIMER * 1000);

  // Save the cancel function in the room so it can be cancelled if all players submit early
  rooms[code].cancelRoundTimer = cancelRoundTimer;

  // Wait for round timer to finish or be cancelled
  await roundTimerPromise;
  if (!rooms[code]) {
    io.to(code).emit("room-deleted");
    io.in(code).socketsLeave(code);
    return;
  }
  // Clear the cancel function from the room
  rooms[code].cancelRoundTimer = null;

  // Emit that game timer is finished
  io.to(code).emit("round-timer-finished");

  // List all unsubmitted players
  const unsubmittedPlayers = rooms[code].players.filter((p) => !p.submitted);

  // Force submit all players
  const forceSubmitAll = await Promise.all(
    unsubmittedPlayers.map((player) =>
      forceSubmitPlayer(player, io, pendingCodeRequests, FORCE_SUBMIT_TIMEOUT),
    ),
  );

  // Check if room still exists
  if (!rooms[code]) {
    io.to(code).emit("room-deleted");
    io.in(code).socketsLeave(code);
    return;
  }

  // Process all force submissions
  await Promise.all(
    forceSubmitAll.map(({ player, codeInput, language }) =>
      processSubmission(
        io,
        rooms[code],
        code,
        player,
        codeInput,
        language,
        ROUND_TIMER,
      ),
    ),
  );

  // Check if room still exists
  if (!rooms[code]) {
    io.to(code).emit("room-deleted");
    io.in(code).socketsLeave(code);
    return;
  }

  // Determine player eliminated (if more than 1 player left)
  let playerEliminated = null;
  if (rooms[code].players.length > 1) {
    playerEliminated = determinePlayerEliminated(
      rooms[code],
      rooms[code].roundResults,
    );
    eliminatePlayer(io, rooms[code], code, playerEliminated);
  }

  // Check if game is over (only one player left)
  console.log(`Players remaining in room ${code}:`, rooms[code].players);
  if (rooms[code].players.length == 1) {
    console.log(
      `Game over in room ${code}, winner: ${rooms[code].players[0].username}`,
    );
    const winner = rooms[code].players[0];
    await gameOver(io, rooms, code, playerEliminated, winner);
    // Game is over, return
    return;
  }

  // Send results
  await sendResults(io, rooms[code], code, playerEliminated);

  // Check if room still exists
  if (!rooms[code]) {
    io.to(code).emit("room-deleted");
    io.in(code).socketsLeave(code);
    return;
  }

  // Reset player states
  rooms[code].players.forEach((player) => {
    player.submitted = false;
    player.judging = false;
    player.codeInput = "";
  });

  // Reset room states
  rooms[code].currentQuestion = null;
  rooms[code].roundResults = [];

  // Emit to each client that round has ended and new round is starting to reset their states
  io.to(code).emit("new-round");
};

// Start game
export const startGame = async (
  io,
  socket,
  code,
  rooms,
  pendingCodeRequests,
) => {
  // Build a list of all available questions for the game based on the room's difficulty
  const questions = await db.query(
    "SELECT * FROM questions WHERE difficulty = $1",
    [rooms[code].difficulty],
  );
  rooms[code].questions = questions.rows;
  console.log(`Available questions for room ${code}:`, rooms[code].questions);

  // While loop to start rounds until game is over
  while (rooms[code] && rooms[code].players.length > 0) {
    await startRound(io, socket, code, rooms, pendingCodeRequests);
    console.log(`Round ${rooms[code]?.currentRound} completed in room ${code}`);
  }
};
