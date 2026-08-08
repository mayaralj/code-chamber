// Imports
import handleStartGame from "../game/startGame.js";
import reconnectGame from "../game/reconnectGame.js";
import leaveGame from "../game/leaveGame.js";
import { handleSubmitCode } from "../game/submission.js";
import { startReconnectTimeout } from "../game/reconnectGame.js";

const setUpGameSockets = (io, socket) => {
  socket.on("start-game", ({ code }) => {
    handleStartGame(io, socket, code);
  });

  // Listen for code submission
  socket.on("submit-code", (submitData) => {
    console.log("submit-code event received:", submitData);
    handleSubmitCode(io, socket, submitData);
  });

  // on game leave room
  socket.on("game-leave-room", ({ code }) => {
    leaveGame(io, socket, code);
  });

  // Listen for reconnect game
  socket.on("reconnect-game", ({ code }) => {
    reconnectGame(io, socket, code);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    startReconnectTimeout(io, socket);
  });
};

export default setUpGameSockets;
