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

// Config
// Timers (s)
const COUNTDOWN_TIMER = 5;
const ROUND_TIMER = 30;
// Timeouts (ms)
const FORCE_SUBMIT_TIMEOUT = 5000;

// Before Round
const beforeRound = (room) => {
  // Increment current round
  const curRound = room.currentRound + 1;
  room.currentRound = curRound;

  // Round Data
  const roundData = room.roundData[curRound];

  // Begin initial countdown
  roundData.endsAt = Date.now() + 1000 * COUNTDOWN_TIMER;

  return [curRound, roundData];
};

// Start round
const startRound = async (io, socket, code, rooms, pendingCodeRequests) => {
  // Before Round
  const [curRound, roundData] = beforeRound(rooms[code]);

  console.log(`Round events:`, roundData?.roundEvents);

  // If this is the first round, emit game-started, else emit timer-tick and send-question
  if (curRound === 1) {
    console.log(`Current round is 1, emitting game-started for room ${code}`);
    io.to(code).emit("game-started", {
      code,
      serverPlayers: buildPlayerList(rooms[code]),
      endsAt: roundData.endsAt,
      question: roundData.question,
      beforeRoundEvents: roundData?.roundEvents?.beforeRound,
    });
  } else {
    io.to(code).emit("timer-tick", { newEndsAt: roundData.endsAt });
    io.to(code).emit("send-question", { question: roundData.question });
    io.to(code).emit("before-round-events", {
      beforeRoundEvents: roundData?.roundEvents?.beforeRound,
    });
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
    const playerEliminated = determinePlayerEliminated(roundData);
    // Dont eliminate if missed bullet
    if (roundData?.roundEvents?.afterRound?.includes("missedBullet")) {
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
      eliminatePlayer(io, rooms[code], code, roundData, playerEliminated);
    }
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

export default startRound;
