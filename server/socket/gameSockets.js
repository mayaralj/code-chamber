// Imports
import getQuestion from "./questionSockets.js";

// Config
const COUNTDOWN_TIMER = 5;
const ROUND_TIMER = 30;
const RESULTS_TIMER = 15;

// Sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cancellable sleep helper
const cancellableSleep = (ms) => {
  // Create a promise and store resolve
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });

  // Create a timeout to resolve the promise after the specified time
  const timeout = setTimeout(() => {
    resolve();
  }, ms);

  // allow it to be cancellable
  const cancel = () => {
    clearTimeout(timeout);
    resolve();
  };

  // return the promise and the cancel function
  return { promise, cancel };
};

const setUpGameSockets = (io, socket, { rooms, questions }) => {
  // Helper to notify players of code submission
  const notifySubmission = (room, code) => {
    // Build a list of all submitted players
    const submittedPlayers = room.players
      .filter((p) => p.submitted)
      .map((p) => p.username);

    // Notify player that code has been submitted
    socket.emit("code-submitted");

    // Emit to all players with list of submitted players
    io.to(code).emit("submitted-players", {
      submittedPlayers,
    });
  };

  // Send results
  const sendResults = async (room, code) => {
    // Build results object
    const results = room.players.map((p) => ({
      username: p.username,
      submitTime: p.submitTime,
    }));
    const resultsEndsAt = Date.now() + 1000 * RESULTS_TIMER;
    io.to(code).emit("send-results", { results, resultsEndsAt });

    // Sleep for results timer duration
    await sleep(RESULTS_TIMER * 1000);

    // Emit that results timer is finished
    io.to(code).emit("results-timer-finished");
  };

  // Start game event
  const startRound = async (code) => {
    // Check if room exists
    if (!rooms[code]) {
      return;
    }

    // Begin initial countdown
    const endsAt = Date.now() + 1000 * COUNTDOWN_TIMER;

    // If its the first round emit game started, otherwise just emit timer tick
    const randomQuestion = getQuestion(io, code, rooms[code], questions);
    if (rooms[code].currentRound === 0) {
      io.to(code).emit("game-started", {
        code,
        endsAt,
        question: randomQuestion,
      });
    } else {
      io.to(code).emit("timer-tick", { endsAt });
      io.to(code).emit("send-question", { question: randomQuestion });
    }

    // Wait for countdown to finish before sending question
    await sleep(COUNTDOWN_TIMER * 1000);
    if (!rooms[code]) {
      return;
    }

    // Emit that timer is finished
    io.to(code).emit("timer-finished");

    // Start game timer
    const roundTimerEndsAt = Date.now() + 1000 * ROUND_TIMER;
    io.to(code).emit("round-tick", { roundTimerEndsAt });

    // Save start round time
    rooms[code].roundStartTime = Date.now();

    // Create a new promise and cancel function for the round timer
    const { promise: roundTimerPromise, cancel: cancelRoundTimer } =
      cancellableSleep(ROUND_TIMER * 1000);

    // Save the cancel function in the room so it can be cancelled if all players submit early
    rooms[code].cancelRoundTimer = cancelRoundTimer;

    // Wait for round timer to finish or be cancelled
    await roundTimerPromise;
    if (!rooms[code]) {
      return;
    }
    // Clear the cancel function from the room
    rooms[code].cancelRoundTimer = null;

    // Emit that game timer is finished
    io.to(code).emit("round-timer-finished");

    // Force Submit all players who havent submitted
    rooms[code].players.forEach((p) => {
      if (!p.submitted) {
        p.submitted = true;
        p.submitTime = ROUND_TIMER;
      }
    });

    // Notify players of submission
    notifySubmission(rooms[code], code);

    // Send results
    await sendResults(rooms[code], code);

    // TODO
  };
  socket.on("start-game", ({ code }) => {
    // Check if room is valid
    const room = rooms[code];
    if (!room) {
      return;
    }

    // Check if its the host
    if (room.host.id !== socket.id) {
      return;
    }

    // Mark room as game started
    room.isGameStarted = true;
    console.log(`Game started in room ${code}`);

    startRound(code);
  });

  // Listen for code submission
  socket.on("submit-code", ({ code, codeInput, language, timeSubmitted }) => {
    // Check if room is valid
    const room = rooms[code];
    if (!room) {
      socket.emit("submit-code-error", { message: "Room not found" });
      return;
    }

    // Validate time submitted
    if (typeof timeSubmitted !== "number" || isNaN(timeSubmitted)) {
      socket.emit("submit-code-error", { message: "Invalid time submitted" });
      return;
    }

    // Check if time submitted is way to off current time
    const currentTime = Date.now();
    if (Math.abs(timeSubmitted - currentTime) > 5000) {
      // 5 second window
      socket.emit("submit-code-error", {
        message: "Time submitted is out of bounds",
      });
      return;
    }

    // Update player's submitted status
    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.submitted = true;

      // Calculate time submitted
      const roundStartTime = room.roundStartTime || Date.now();
      player.submitTime = (timeSubmitted - roundStartTime) / 1000;
    }

    // Notify players that code has been submitted
    notifySubmission(room, code);

    // If all players have submitted, stop game timer to send all results
    if (room.players.every((p) => p.submitted)) {
      if (room.cancelRoundTimer) {
        room.cancelRoundTimer();
      }
    }
  });
};

export default setUpGameSockets;
