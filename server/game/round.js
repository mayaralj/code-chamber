// Imports
import { sleep, cancellableSleep } from "../utils/timers.js";
import { buildPlayerList } from "../utils/playerList.js";
import {
  processSubmission,
  forceSubmitPlayer,
  calculateScore,
} from "./submission.js";
import { determinePlayerEliminated, eliminatePlayer } from "./elimination.js";
import checkRoom from "../room/checkRoom.js";
import { sendResults, gameOver } from "./results.js";
import { rooms, playersInRooms } from "../index.js";

// Config
// Timers (s)
const COUNTDOWN_TIMER = 5;
const ROUND_TIMER = 15;
// Timeouts (ms)
const FORCE_SUBMIT_TIMEOUT = 5000;

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
    io.to(code).emit("game-started", {
      code,
      serverPlayers: buildPlayerList(rooms[code]),
      endsAt: roundData.endsAt,
      question: roundData.question,
      beforeRoundEvents: roundEvents?.beforeRound,
    });
  } else {
    // Emit to each client that new round is starting and send updated player list
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
  if (!checkRoom(code)) {
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
  if (rooms[code].players.length > 1) {
    // Create a new promise and cancel function for the round timer
    const { promise: roundTimerPromise, cancel: cancelRoundTimer } =
      cancellableSleep((ROUND_TIMER / timeMultiplier) * 1000);

    // Save the cancel function in the room so it can be cancelled if all players submit early
    roundData.cancelRoundTimer = cancelRoundTimer;
    await roundTimerPromise;
    // Clear the cancel function from the room
    roundData.cancelRoundTimer = null;
    console.log(
      `Round timer finished for room ${code}, processing submissions`,
    );
  }
  if (!checkRoom(code)) {
    return;
  }

  // Emit that game timer is finished
  io.to(code).emit("round-timer-finished");

  // List all unsubmitted players (not submitted and not judging)
  const unsubmittedPlayers = rooms[code].players.filter((p) => {
    const playerRoundData = p?.gameData?.roundData?.[curRound];
    return !playerRoundData?.submitted && !playerRoundData?.judging;
  });

  // Force submit all players
  const forceSubmitAll = await Promise.all(
    unsubmittedPlayers.map((player) => {
      console.log(
        `Requesting force submit for player ${player.username} in room ${code}`,
      );
      return forceSubmitPlayer(
        player,
        io,
        rooms[code].pendingCodeRequests,
        FORCE_SUBMIT_TIMEOUT,
      );
    }),
  );

  // Check if room still exists
  if (!checkRoom(code)) {
    return;
  }

  // Process all force submissions
  await Promise.all(
    forceSubmitAll.map(({ player, codeInput, language }) => {
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
  if (!checkRoom(code)) {
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
  if (!checkRoom(code)) {
    return;
  }

  // Disable submissions now
  roundData.submissionsAllowed = false;

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
    await gameOver(io, code, roundData, winner);
    // Game is over, return
    return;
  }

  // Send results
  await sendResults(io, code, roundData);

  // Check if room still exists
  if (!checkRoom(code)) {
    return;
  }
};

export default startRound;
