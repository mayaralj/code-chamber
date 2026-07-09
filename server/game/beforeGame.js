// Imports
import { setUpGameQuestions } from "./questionHandler.js";
import { determineAllEvents } from "./roundEvents.js";

// Function to handle before game initialization
const beforeGame = async (rooms, code) => {
  // Initialize round data
  rooms[code].roundData = {};
  rooms[code].currentRound = 0;

  // Determine all events (which also determines how many rounds there will be)
  determineAllEvents(rooms[code]);

  // Set up game questions
  await setUpGameQuestions(rooms, code);
};

export default beforeGame;
