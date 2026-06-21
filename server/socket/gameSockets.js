// Imports
import db from "../db.js";

// Question
import getQuestion from "./questionSockets.js";

// Import submission processor
import { processSubmission } from "../game/submission.js";

// Import round manager
import { notifySubmission, startRound } from "../game/round.js";

const setUpGameSockets = (
  io,
  socket,
  { rooms, playersInRooms, pendingCodeRequests, questions },
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

    // Check if all players have submitted after someone leaves
    if (room.players.every((p) => p.submitted)) {
      if (room.cancelRoundTimer) {
        room.cancelRoundTimer();
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

    // Check if more than 1 player
    if (room.players.length < 1) {
      return;
    }

    // Mark room as game started
    room.isGameStarted = true;
    console.log(`Game started in room ${code}`);

    startRound(io, socket, code, rooms, questions, pendingCodeRequests);
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
      if (!player || player.submitted) {
        return;
      }
      player.submitted = true;
      // Notify players that code has been submitted (visual reasons only)
      notifySubmission(io, socket, room, code);

      // Get the submit time
      const roundStartTime = room.roundStartTime || Date.now();
      const submitTime = (timeSubmitted - roundStartTime) / 1000;

      // Process submission
      await processSubmission(
        room,
        code,
        player,
        codeInput,
        language,
        submitTime,
      );

      // If all players have submitted, stop game timer to send all results
      if (room.players.every((p) => p.submitted)) {
        if (room.cancelRoundTimer) {
          room.cancelRoundTimer();
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
