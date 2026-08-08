// Imports
import { rooms } from "../globals.js";

// Helper to wait for pending code
const waitForPendingCode = (rooms, code, existingPlayer, socket) => {
  const pending = rooms[code].pendingCodeRequests?.get(existingPlayer.userId);
  if (!pending) return Promise.resolve(); // nothing pending, resolve immediately

  // Create new promise so we wait for the pending code to be resolved before proceeding
  return new Promise((resolve) => {
    socket.emit("request-code", {}, (response) => {
      // Cleanup
      clearTimeout(pending.timeoutHandle);
      rooms[code].pendingCodeRequests.delete(existingPlayer.userId);
      // Resolve with the code and language received from the server
      pending.resolve({ userId: existingPlayer.userId, code: response.code });
      // Resolve this promise to indicate that the pending code has been handled
      resolve();
    });
  });
};

// helper to rejoin game (room wait also needs it so thats why export)
const reconnectGame = async (io, socket, code) => {
  // Check if room is valid
  const room = rooms[code];
  if (!room) {
    socket.emit("reconnect-game-error", { message: "Room not found" });
    return;
  }

  // Check if player is valid (makes sure they havent been eliminated)
  const player = room.players.find((p) => p.userId === socket.data.id);
  if (!player) {
    socket.emit("reconnect-game-error", { message: "Player not found" });
    return;
  }

  // Update player socket id
  player.socketId = socket.id;
  // Enter socket room
  socket.join(code);

  // Cancel reconnecting
  player.isReconnecting = false;
  if (player.disconnectTimeout) {
    clearTimeout(player.disconnectTimeout);
    player.disconnectTimeout = null;
  }

  // Get player round data
  const playerRoundData = player?.gameData?.roundData[room.currentRound];
  if (!playerRoundData) {
    socket.emit("reconnect-game-error", {
      message: "No round data found for player",
    });
    return;
  }

  // Emit to the player the current game state
  const reconnectData = {
    ...room.reconnectData,
    submitted: playerRoundData.submitted,
    judging: playerRoundData.judging,
  };
  socket.emit("reconnect-game-success", reconnectData);

  // Find current round data
  const roundData = room.roundData[room.currentRound];

  // Wait for any pending code requests to finish before proceeding
  await waitForPendingCode(rooms, code, player, socket);

  // Find reconnect sleep cancel in room
  if (roundData?.reconnectSleepCancel) {
    // Loop and check if this player is the final player to reconnect to cancel
    if (room.players.every((p) => !p.isReconnecting)) {
      roundData.reconnectSleepCancel();
    }
  }
};
export default reconnectGame;
