import { setUpGameQuestions } from "./questionHandler.js";
import { sleep, cancellableSleep } from "../utils/timers.js";
import { buildPlayerList } from "../utils/playerList.js";
import {
  processSubmission,
  forceSubmitPlayer,
  calculateScore,
} from "./submission.js";

// Config
// Timers (s)
const COUNTDOWN_TIMER = 5;
const GAME_OVER_TIMER = 5;
const ROUND_TIMER = 30;
const RESULTS_TIMER = 10;
// Timeouts (ms)
const FORCE_SUBMIT_TIMEOUT = 5000;

// Helper to delete room
const deleteRoom = (io, rooms, code) => {
  if (!rooms[code]) {
    return;
  }
  io.to(code).emit("room-deleted");
  io.in(code).socketsLeave(code);
  delete rooms[code];
  console.log(`Room ${code} deleted`);
};

// Helper to check if room exists and delete it if not
const checkRoom = (io, rooms, code) => {
  if (rooms[code]) {
    return true;
  }

  deleteRoom(io, rooms, code);
  return false;
};

// Helper to determine player eliminated
const determinePlayerEliminated = (roundData) => {
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

// Send results
const sendResults = async (io, room, code, roundData) => {
  // Check if player eliminated exists, if not, set to N/A
  if (!roundData.playerEliminated) {
    console.log(`No player eliminated in room ${code}, sending results`);
    roundData.playerEliminated = { username: "N/A" };
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
  });

  // Sleep for results timer duration
  await sleep(RESULTS_TIMER * 1000);

  // Emit that results timer is finished
  io.to(code).emit("results-timer-finished");
};

// Game over helper
const gameOver = async (io, rooms, code, roundData, winner) => {
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

// Start game event
const startRound = async (io, socket, code, rooms, pendingCodeRequests) => {
  // Increment current round
  const curRound = rooms[code].currentRound + 1;
  rooms[code].currentRound = curRound;

  // Construct Round Data
  rooms[code].roundData[curRound] = { roundNumber: curRound, roundResults: [] };
  let roundData = rooms[code].roundData[curRound];

  // Begin initial countdown
  roundData.endsAt = Date.now() + 1000 * COUNTDOWN_TIMER;

  // Get the question for this round
  roundData.question = rooms[code].questions[curRound - 1];

  // If this is the first round, emit game-started, else emit timer-tick and send-question
  if (curRound === 1) {
    console.log(`Current round is 1, emitting game-started for room ${code}`);
    io.to(code).emit("game-started", {
      code,
      serverPlayers: buildPlayerList(rooms[code]),
      endsAt: roundData.endsAt,
      question: roundData.question,
    });
  } else {
    console.log(
      `New EndsAt for room ${code}: ${roundData.endsAt}, emitting timer-tick and send-question`,
    );
    io.to(code).emit("timer-tick", { newEndsAt: roundData.endsAt });
    console.log(`Emitting send-question for room ${code}`);
    io.to(code).emit("send-question", { question: roundData.question });
  }

  // Wait for countdown to finish before sending question
  await sleep(COUNTDOWN_TIMER * 1000);
  if (!checkRoom(io, rooms, code)) {
    return;
  }

  // Emit that timer is finished
  io.to(code).emit("timer-finished");

  // Save start round time
  roundData.roundStartTime = Date.now();
  roundData.roundEndsAt = Date.now() + 1000 * ROUND_TIMER;
  // Start game timer
  io.to(code).emit("round-tick", { roundEndsAt: roundData.roundEndsAt });

  // Create a new promise and cancel function for the round timer
  const { promise: roundTimerPromise, cancel: cancelRoundTimer } =
    cancellableSleep(ROUND_TIMER * 1000);

  // Save the cancel function in the room so it can be cancelled if all players submit early
  roundData.cancelRoundTimer = cancelRoundTimer;

  // Wait for round timer to finish or be cancelled
  await roundTimerPromise;
  if (!checkRoom(io, rooms, code)) {
    return;
  }
  // Clear the cancel function from the room
  roundData.cancelRoundTimer = null;
  console.log(`Round timer finished for room ${code}, processing submissions`);

  // Emit that game timer is finished
  io.to(code).emit("round-timer-finished");

  // List all unsubmitted players (not submitted and not judging)
  const unsubmittedPlayers = rooms[code].players.filter(
    (p) => !p.submitted && !p.judging,
  );

  // Force submit all players
  const forceSubmitAll = await Promise.all(
    unsubmittedPlayers.map((player) => {
      console.log(
        `Requesting force submit for player ${player.username} in room ${code}`,
      );
      return forceSubmitPlayer(
        player,
        io,
        pendingCodeRequests,
        FORCE_SUBMIT_TIMEOUT,
      );
    }),
  );

  // Check if room still exists
  if (!checkRoom(io, rooms, code)) {
    return;
  }

  // Process all force submissions
  await Promise.all(
    forceSubmitAll.map(({ player, codeInput, language }) => {
      console.log(`Force submitting player ${player.username} in room ${code}`);
      return processSubmission(
        io,
        rooms[code],
        code,
        player,
        codeInput,
        language,
        ROUND_TIMER,
      );
    }),
  );

  // Check if room still exists
  if (!checkRoom(io, rooms, code)) {
    return;
  }

  // Check for pending submissions and wait for them to finish (not from force submission)
  if (roundData.pendingSubmissions?.size > 0) {
    console.log(`Waiting for pending submissions in room ${code}...`);
    await Promise.all(roundData.pendingSubmissions.values());
  }

  console.log(
    "All players have submitted or been force submitted, processing results",
  );

  // Check room
  if (!checkRoom(io, rooms, code)) {
    return;
  }

  // Calculate scores for all players
  roundData.roundResults.forEach((result) => {
    result.score = calculateScore(
      result,
      roundData.averageExecutionTime[result.languageUsed],
    );
  });

  // Determine player eliminated (if more than 1 player left)
  if (rooms[code].players.length > 1) {
    determinePlayerEliminated(roundData);
    eliminatePlayer(io, rooms[code], code, roundData);
  }

  // Check if game is over (only one player left)
  console.log(`Players remaining in room ${code}:`, rooms[code].players);
  if (rooms[code].players.length == 1) {
    console.log(
      `Game over in room ${code}, winner: ${rooms[code].players[0].username}`,
    );
    const winner = rooms[code].players[0];
    await gameOver(io, rooms, code, roundData, winner);
    // Game is over, return
    return;
  }

  // Send results
  await sendResults(io, rooms[code], code, roundData);

  // Check if room still exists
  if (!checkRoom(io, rooms, code)) {
    return;
  }

  // Reset player states
  rooms[code].players.forEach((player) => {
    player.submitted = false;
    player.judging = false;
    player.codeInput = "";
  });

  // Emit to each client that round has ended and new round is starting to reset their states
  io.to(code).emit("new-round", { players: buildPlayerList(rooms[code]) });
};

// Start game
export const startGame = async (
  io,
  socket,
  code,
  rooms,
  pendingCodeRequests,
) => {
  // Set up game questions
  await setUpGameQuestions(io, code, rooms);

  // CHeck if room still exists
  if (!checkRoom(io, rooms, code)) {
    return;
  }

  // Initialize Round data
  rooms[code].roundData = {};

  // While loop to start rounds until game is over
  while (rooms[code] && rooms[code].players.length > 0) {
    await startRound(io, socket, code, rooms, pendingCodeRequests);
    console.log(`Round ${rooms[code]?.currentRound} completed in room ${code}`);
  }
};
