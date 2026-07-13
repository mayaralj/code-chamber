// Import submission processor
import { processSubmission } from "../game/submission.js";

// import build player list
import { buildPlayerList } from "../utils/playerList.js";

// Import round manager
import startGame from "../game/startGame.js";

const setUpGameSockets = (
  io,
  socket,
  { rooms, playersInRooms, pendingCodeRequests },
) => {
  // Game leave
  const gameLeave = (code) => {
    // Check if room is valid
    const room = rooms[code];
    if (!room) {
      console.log(
        `Socket ${socket.id} attempted to leave room in game: ${code} but it was not found`,
      );
      return;
    }

    // If not game started, let roomSockets handle it
    if (!room.isGameStarted) {
      return;
    }

    // Remove player from room
    room.players = room.players.filter((p) => p.id !== socket.id);

    // Leave from socket room
    socket.leave(code);

    // Remove from fast lookup
    delete playersInRooms[socket.id];

    // Check if no players remaining
    if (room.players.length === 0) {
      delete rooms[code];
      console.log(`Room ${code} deleted as last player left`);
      return;
    }

    // Notify players in the room that someone left
    io.to(code).emit("player-left", { players: buildPlayerList(room) });

    // Check if all players have submitted after someone leaves or player is only one left
    if (
      room.players.every((p) => {
        const playerRoundData = p?.gameData?.roundData?.[room.currentRound];
        return playerRoundData?.submitted;
      }) ||
      room.players.length === 1
    ) {
      if (room.roundData[room.currentRound]?.cancelRoundTimer) {
        // Force end round
        room.roundData[room.currentRound].cancelRoundTimer();
      }
    }
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

    // Ensur game has not already started
    if (room.isGameStarted) {
      return;
    }

    // Check if more than 1 player
    if (room.players.length < 1) {
      return;
    }

    // Mark room as game started
    room.isGameStarted = true;
    console.log(`Game started in room ${code}`);

    startGame(io, socket, code, rooms, pendingCodeRequests);
  });

  // Listen for code submission
  socket.on(
    "submit-code",
    async ({ code, codeInput, language, timeSubmitted }) => {
      // Check if room is valid
      const room = rooms[code];
      if (!room) {
        socket.emit("submit-code-error", { message: "Room not found" });
        return;
      }

      // Check if player is valid and not already submitted or judging
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) {
        socket.emit("submit-code-error", { message: "Player not found" });
        return;
      }
      const playerRoundData = player?.gameData?.roundData?.[room.currentRound];
      if (
        !playerRoundData ||
        playerRoundData?.submitted ||
        playerRoundData?.judging
      ) {
        return;
      }

      // Get round data
      const roundData = room.roundData[room.currentRound];
      if (!roundData) {
        socket.emit("submit-code-error", { message: "No round data found" });
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

      // Get the submit time
      const roundStartTime = roundData.roundStartTime || Date.now();
      const submitTime = (timeSubmitted - roundStartTime) / 1000;

      // Init pending submissions map if not already
      if (!roundData.pendingSubmissions) {
        roundData.pendingSubmissions = new Map();
      }

      // Store submission promise
      const submissionPromise = processSubmission(
        io,
        room,
        code,
        player,
        codeInput,
        language,
        submitTime,
      );

      // Set in the map
      roundData.pendingSubmissions.set(player.id, submissionPromise);

      // Wait for submission to finish
      await submissionPromise;

      // Delete from the map
      roundData.pendingSubmissions.delete(player.id);

      // If all players have submitted, stop game timer to send all results
      if (
        room.players.every(
          (p) => p?.gameData?.roundData?.[room.currentRound]?.submitted,
        )
      ) {
        if (roundData.cancelRoundTimer) {
          console.log(
            `All players have submitted in room ${code}, cancelling round timer`,
          );
          roundData.cancelRoundTimer();
        }
      }
    },
  );

  // Code request listener
  socket.on(`current-code`, ({ codeInput, language }) => {
    const resolver = pendingCodeRequests.get(socket.id);
    if (resolver) {
      resolver({ codeInput, language });
      pendingCodeRequests.delete(socket.id);
    }
  });

  // on game leave room
  socket.on("game-leave-room", ({ code }) => {
    gameLeave(code);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    gameLeave(playersInRooms[socket.id]);
  });
};

export default setUpGameSockets;
