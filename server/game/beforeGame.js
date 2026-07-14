// Imports
import { setUpGameQuestions } from "./questionHandler.js";
import { determineAllEvents } from "./roundEvents.js";

// Function to handle before game initialization
const beforeGame = async (rooms, code) => {
  // Initialize round data
  rooms[code].roundData = {};
  rooms[code].currentRound = 0;
  rooms[code].pendingCodeRequests = new Map();

  // Determine all events (which also determines how many rounds there will be)
  determineAllEvents(rooms[code]);

  // Loop through all players and init their gameData
  rooms[code].players.forEach((player) => {
    player.gameData = {};
  });

  // Set up game questions
  await setUpGameQuestions(rooms, code);
};

export default beforeGame;
