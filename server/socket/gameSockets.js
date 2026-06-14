const setUpGameSockets = (io, socket, { rooms, questions }) => {
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
