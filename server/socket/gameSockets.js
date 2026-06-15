const setUpGameSockets = (io, socket, { rooms, questions }) => {
  // Start game event
  socket.on("start-game", ({ code }) => {
    const room = rooms[code];
    if (!room) {
      return;
    }
    room.isGameStarted = true;
    console.log("start-game received for code:", code);

    const countdownTimer = 5;
    const endsAt = Date.now() + 1000 * countdownTimer;
    io.to(code).emit("game-started", { code, endsAt });

    // Start a Countdown
    setTimeout(() => {
      // Check if room still exists before emitting timer finished
      if (!rooms[code]) {
        return;
      }
      io.to(code).emit("timer-finished");
    }, countdownTimer * 1000);

    console.log(`Game started in room ${code}`);
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

    // Build a list of all submitted players
    const submittedPlayers = room.players
      .filter((p) => p.submitted)
      .map((p) => p.username);

    // Emit to all players with list of submitted players
    io.to(code).emit("code-submitted", {
      submittedPlayers,
    });
  });
};

export default setUpGameSockets;
