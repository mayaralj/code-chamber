// Imports
import checkRoom from "../room/checkRoom.js";
import beforeGame from "./beforeGame.js";
import startRound from "./round.js";
import { sleep } from "../utils/timers.js";

// Start game
const startGame = async (io, socket, code, rooms) => {
  // Call beforeGame initialization
  await beforeGame(rooms, code);

  // Sleep for 5 seconds before starting first round (so players can see the "Game Starting" message)
  await sleep(5000);

  // CHeck if room still exists
  if (!checkRoom(io, rooms, code)) {
    return;
  }

  // While loop to start rounds until game is over
  while (rooms[code] && rooms[code].players.length > 0) {
    await startRound(io, socket, code, rooms);
    console.log(`Round ${rooms[code]?.currentRound} completed in room ${code}`);
  }
};

export default startGame;
