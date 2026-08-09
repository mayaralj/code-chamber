// Imports
import { setUpGameQuestions } from "./questionHandler.js";
import { determineAllEvents } from "./round/roundEvents.js";
import { sleep } from "../utils/timers.js";
import { rooms } from "../globals.js";
import { broadcastUpdateRoom } from "../broadcast/broadcastRooms.js";
import { updateMatchesPlayed, isRoomStillValid } from "./gameUtils.js";

// Config
const WAIT_TIME_BEFORE_GAME_START = 3500;

// Function to handle before game initialization
const beforeGame = async (io, socket, code) => {
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

  // Check if room still valid
  if (!isRoomStillValid(io, socket, code)) {
    return;
  }

  // Sleep for the configured time before starting first round (so players can see the "Game Starting" message)
  await sleep(WAIT_TIME_BEFORE_GAME_START);

  // Check if room still valid
  if (!isRoomStillValid(io, socket, code)) {
    return;
  }

  // Update matches played for all players
  await Promise.all(
    rooms[code].players.map((player) => updateMatchesPlayed(player)),
  );

  // Check if room still valid
  if (!isRoomStillValid(io, socket, code)) {
    return;
  }

  // Mark room as game started
  rooms[code].isGameStarted = true;
  rooms[code].isGameStarting = false;
  broadcastUpdateRoom(io, rooms[code]);
  console.log(`Game started in room ${code}`);
};

export default beforeGame;
