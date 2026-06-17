// Imports
import getQuestion from "./questionSockets.js";

// Config
const COUNTDOWN_TIMER = 5;
const GAME_TIMER = 30;

// Sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setUpGameSockets = (io, socket, { rooms, questions }) => {
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
    const gameTimerEndsAt = Date.now() + 1000 * GAME_TIMER;
    io.to(code).emit("game-tick", { gameTimerEndsAt });
    await sleep(GAME_TIMER * 1000);
    if (!rooms[code]) {
      return;
    }

    // Emit that game timer is finished
    io.to(code).emit("game-timer-finished");

    // Force Submit all players who havent submitted
    rooms[code].players.forEach((p) => {
      if (!p.submitted) {
        p.submitted = true;
      }
    });

    // Notify players of submission
    notifySubmission(rooms[code], code);

    // TODO
  };
  socket.on("start-game", ({ code }) => {
    // Check if room is valid
    const room = rooms[code];
    if (!room) {
      return;
    }

    // Mark room as game started
    room.isGameStarted = true;
    console.log(`Game started in room ${code}`);

    startRound(code);
  });

  // Listen for code submission
  socket.on("submit-code", ({ code, codeInput, language }) => {
    // Check if room is valid
    const room = rooms[code];
    if (!room) {
      socket.emit("submit-code-error", { message: "Room not found" });
      return;
    }

    // Update player's submitted status
    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.submitted = true;
    }

    // Notify players that code has been submitted
    notifySubmission(room, code);
  });
};

export default setUpGameSockets;
