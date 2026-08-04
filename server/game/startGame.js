// Imports
import beforeGame from "./beforeGame.js";
import startRound from "./round.js";
import { rooms } from "../index.js";

// Start game
const startGame = async (io, socket, code) => {
  // Call beforeGame initialization
  await beforeGame(io, code);

  // While loop to start rounds until game is over
  while (rooms[code] && rooms[code].players.length > 0) {
    await startRound(io, socket, code);
    console.log(`Round ${rooms[code]?.currentRound} completed in room ${code}`);
  }
};

export default startGame;
