// Imports
import { sleep, cancellableSleep } from "../utils/timers.js";
import { buildPlayerList } from "../utils/playerList.js";
import {
  processSubmission,
  getPlayerCode,
  calculateScore,
} from "./submission.js";
import { determinePlayerEliminated, eliminatePlayer } from "./elimination.js";
import { sendResults, gameOver } from "./results.js";
import { rooms, playersInRooms } from "../globals.js";

// Config
// Timers (s)
const COUNTDOWN_TIMER = 5;
const ROUND_TIMER = 30;
// Timeouts (ms)
const FORCE_SUBMIT_TIMEOUT = 50000;

// Helper to wait for reconnecting players to reconnect or timeout
const waitForReconnectingPlayers = async (io, code) => {
  // Get room and round data
  const room = rooms[code];
  if (!room) {
    console.error(
      `Room ${code} not found for waiting for reconnecting players`,
    );
    return;
  }
  const roundData = room.roundData[room.currentRound];

  // If any players are reconnecting, sleep until they reconnect or timeout
  const reconnectingPlayersCount = rooms[code].players.filter(
    (p) => p.isReconnecting,
  ).length;
  if (reconnectingPlayersCount > 0) {
    console.log(
      `Room ${code} has ${reconnectingPlayersCount} reconnecting players, waiting for them to reconnect...`,
    );
    io.to(code).emit("waiting-for-reconnect");
    // Store a cancellable sleep
    const { promise: reconnectSleepPromise, cancel: cancelReconnectSleep } =
      cancellableSleep(1000 * 60 * 5);
    roundData.reconnectSleepCancel = cancelReconnectSleep;
    await reconnectSleepPromise;
    roundData.reconnectSleepCancel = null;
    console.log(
      `Room ${code} finished waiting for reconnecting players, continuing to process round`,
    );
    io.to(code).emit("players-reconnected", {
      players: buildPlayerList(rooms[code]),
    });
  }
};

// Build reconnecting data for the game so its easy to send to players that reconnet
const buildReconnectData = (room, phase) => {
  // Gather base data
  const roundData = room.roundData[room.currentRound];
  const base = {
    phase,
    code: room.code,
    curRound: room.currentRound,
    players: buildPlayerList(room),
    question: roundData.question,
    beforeRoundEvents: roundData.roundEvents?.beforeRound,
  };

  if (
    phase === "countdown" ||
    phase === "game-started" ||
    phase === "new-round"
  ) {
    room.reconnectData = {
      ...base,
      endsAt: roundData.endsAt,
    };
  } else if (phase === "round-tick") {
    room.reconnectData = {
      ...base,
      roundEndsAt: roundData.roundEndsAt,
      timeMultiplier: roundData.roundEvents?.beforeRound?.fasterTimer || 1,
    };
  } else if (phase === "results") {
    room.reconnectData = {
      ...base,
      roundResults: roundData.roundResults,
      eliminatedPlayers: roundData.eliminatedPlayers,
      missedPlayer: roundData.missedPlayer,
      winner: roundData.winner,
    };
  }
};

// Before Round
const beforeRound = (room) => {
  // Increment current round
  const curRound = room.currentRound + 1;
  room.currentRound = curRound;

  // Round Data
  const roundData = room.roundData[curRound];

  // Loop through all players and init their new round Data for this round
  room.players.forEach((player) => {
    const playerGameData = player.gameData;
    if (!playerGameData.roundData) {
      playerGameData.roundData = {};
    }
    playerGameData.roundData[curRound] = {
      submitted: false,
      judging: false,
      codeInput: "",
    };
  });

  // Begin initial countdown
  roundData.endsAt = Date.now() + 1000 * COUNTDOWN_TIMER;

  return [curRound, roundData];
};

// Start round
const startRound = async (io, socket, code) => {
  // Before Round
  const [curRound, roundData] = beforeRound(rooms[code]);
  const roundEvents = roundData?.roundEvents;

  console.log(`Round events:`, roundEvents);

  // If this is the first round, emit game-started, else emit timer-tick and send-question
  if (curRound === 1) {
    console.log(`Current round is 1, emitting game-started for room ${code}`);
    // Build reconnect data
    buildReconnectData(rooms[code], "game-started");
    io.to(code).emit("game-started", {
      code,
      serverPlayers: buildPlayerList(rooms[code]),
      endsAt: roundData.endsAt,
      question: roundData.question,
      beforeRoundEvents: roundEvents?.beforeRound,
    });
  } else {
    // Emit to each client that new round is starting and send updated player list
    // Build reconnect data
    buildReconnectData(rooms[code], "new-round");
    io.to(code).emit("new-round", {
      currentRound: curRound,
      newEndsAt: roundData.endsAt,
      question: roundData.question,
      beforeRoundEvents: roundEvents?.beforeRound,
      players: buildPlayerList(rooms[code]),
    });
  }

  // Wait for countdown to finish before sending question
  await sleep(COUNTDOWN_TIMER * 1000);
  if (!rooms[code]) {
    return;
  }

  // Emit that timer is finished
  io.to(code).emit("timer-finished");

  // Save start round time
  roundData.roundStartTime = Date.now();
  const timeMultiplier = roundEvents?.beforeRound?.fasterTimer || 1;
  console.log(`Time multiplier for room ${code}: ${timeMultiplier}`);
  roundData.roundEndsAt = Date.now() + 1000 * ROUND_TIMER;

  // Start game timer
  buildReconnectData(rooms[code], "round-tick");
  io.to(code).emit("round-tick", {
    roundEndsAt: roundData.roundEndsAt,
    timeMultiplier,
  });

  // send to client the original though and it handles the faster timer multiplier visually
  roundData.roundEndsAt = Date.now() + 1000 * (ROUND_TIMER / timeMultiplier);

  // Allow submissions now
  roundData.submissionsAllowed = true;

  // Wait for round timer to finish or be cancelled
  // Only start round timer if enough players are still in the room
  if (rooms[code].players.length > 0) {
    // Create a new promise and cancel function for the round timer
    const { promise: roundTimerPromise, cancel: cancelRoundTimer } =
      cancellableSleep((ROUND_TIMER / timeMultiplier) * 1000);

    // Save the cancel function in the room so it can be cancelled if all players submit early
    roundData.cancelRoundTimer = cancelRoundTimer;
    await roundTimerPromise;
    // Clear the cancel function from the room
    roundData.cancelRoundTimer = null;
  }
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

  // List all unsubmitted players (not submitted and not judging)
  const unsubmittedPlayers = rooms[code].players.filter((p) => {
    const playerRoundData = p?.gameData?.roundData?.[curRound];
    return !playerRoundData?.submitted && !playerRoundData?.judging;
  });

  // Force submit all players
  const getPlayerCodeAll = await Promise.all(
    unsubmittedPlayers.map((player) => {
      console.log(
        `Requesting force submit for player ${player.username} in room ${code}`,
      );
      return getPlayerCode(
        player,
        io,
        rooms[code].pendingCodeRequests,
        roundData.question.starterCode,
        FORCE_SUBMIT_TIMEOUT,
      );
    }),
  );

  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // If any players are reconnecting, wait for them to reconnect or timeout
  await waitForReconnectingPlayers(io, code);

  // Process all force submissions
  await Promise.all(
    getPlayerCodeAll.map(({ player, codeInput, language }) => {
      console.log(`Force submitting player ${player.username} in room ${code}`);
      return processSubmission(
        io,
        code,
        player,
        codeInput,
        language,
        ROUND_TIMER,
      );
    }),
  );

  // Check if room still exists
  if (!rooms[code]) {
    return;
  }

  // If any players are reconnecting, wait for them to reconnect or timeout
  await waitForReconnectingPlayers(io, code);

  // Check for pending submissions and wait for them to finish (not from force submission)
  if (roundData.pendingSubmissions?.size > 0) {
    console.log(`Waiting for pending submissions in room ${code}...`);
    await Promise.all(roundData.pendingSubmissions.values());
  }

  console.log(
    "All players have submitted or been force submitted, processing results",
  );

  // Check room
  if (!rooms[code]) {
    return;
  }

  // If any players are reconnecting, wait for them to reconnect or timeout
  await waitForReconnectingPlayers(io, code);

  // Calculate scores for all players
  if (roundData.roundResults) {
    roundData.roundResults.forEach((result) => {
      result.score = calculateScore(
        result,
        roundData.averageExecutionTime[result.languageUsed],
      );
    });
  }

  // Determine player eliminated (if more than 1 player left)
  if (rooms[code].players.length > 1) {
    const playerEliminated = determinePlayerEliminated(roundData);
    console.log(
      rooms[code].players.length,
      `players left in room ${code}, eliminating player ${playerEliminated.username}`,
    );
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
      eliminatePlayer(
        io,
        rooms[code],
        code,
        roundData,
        secondPlayerEliminated,
        playersInRooms,
      );
    }
    // Dont eliminate if missed bullet
    if (roundEvents?.afterRound?.missedBullet) {
      console.log(
        `Player ${playerEliminated.username} would have been eliminated in room ${code}, but missed bullet event occurred, skipping elimination`,
      );
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

  // Check if game is over (only one player left)
  console.log(`Players remaining in room ${code}:`, rooms[code].players);
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

  // Send results
  buildReconnectData(rooms[code], "results");
  await sendResults(io, code, roundData);

  // Check if room still exists
  if (!rooms[code]) {
    return;
  }
};

export default startRound;
