// Imports
import { setUpGameQuestions } from "./questionHandler.js";
import { determineAllEvents } from "./roundEvents.js";
import db from "../db.js";

// Function to update matches played for a player
const updateMatchesPlayed = async (player) => {
  // Ignore guests
  if (player.isGuest) {
    return;
  }

  await db.query(
    `UPDATE profile_stats
     SET matches_played = matches_played + 1,
         updated_at = NOW()
     WHERE user_id = $1`,
    [player.userId],
  );
};

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

  // Update matches played for all players
  await Promise.all(
    rooms[code].players.map((player) => updateMatchesPlayed(player)),
  );

  // Set up game questions
  await setUpGameQuestions(rooms, code);
};

export default beforeGame;
