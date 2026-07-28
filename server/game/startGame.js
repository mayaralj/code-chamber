// Imports
import beforeGame from "./beforeGame.js";
import startRound from "./round.js";

// Start game
const startGame = async (io, socket, code, rooms) => {
  // Call beforeGame initialization
  await beforeGame(rooms, code);

  // While loop to start rounds until game is over
  while (rooms[code] && rooms[code].players.length > 0) {
    await startRound(io, socket, code, rooms);
    console.log(`Round ${rooms[code]?.currentRound} completed in room ${code}`);
  }
};

export default startGame;
