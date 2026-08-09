// Imports
import handleStartGame from "../game/startGame.js";
import reconnectGame from "../game/reconnectGame.js";
import leaveGame from "../game/leaveGame.js";
import { handleSubmitCode } from "../game/round/submission.js";
import { startReconnectTimeout } from "../game/reconnectGame.js";

const setUpGameSockets = (io, socket) => {
  socket.on("start-game", ({ code }) => {
    handleStartGame(io, socket, code);
  });

  // Listen for code submission
  socket.on("submit-code", (submitData) => {
    handleSubmitCode(io, socket, submitData);
  });

  // on game leave room
  socket.on("leave-game", ({ code }) => {
    console.log("Player leaving game:", socket.id, "from room:", code);
    leaveGame(io, socket, code);
  });

  // Listen for reconnect game
  socket.on("reconnect-game", ({ code }) => {
    reconnectGame(io, socket, code);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    startReconnectTimeout(io, socket);
  });
};

export default setUpGameSockets;
