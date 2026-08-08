// Imports
import { setUpGameQuestions } from "./questionHandler.js";
import { determineAllEvents } from "./roundEvents.js";
import { sleep } from "../utils/timers.js";
import db from "../db.js";
import { rooms, playersInRooms, roomIdToCode } from "../globals.js";
import {
  broadcastRemoveRoom,
  broadcastUpdateRoom,
} from "../broadcast/broadcastRooms.js";

// Config
const WAIT_TIME_BEFORE_GAME_START = 3500;

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

// Helper to check if room is still valid before game officially starts (mainly checks for players that dc while waiting for game to start)
const isRoomStillValid = (io, socket, code) => {
  // If room doesn't exist, return false
  const room = rooms[code];
  if (!room) return false;

  // If room has not enough players, cancel game start and delete room
  if (room.players.length < 1) {
    for (const player of room.players) {
      delete playersInRooms[player.userId];
    }
    io.to(code).emit("game-start-cancelled", {
      message: "Not enough players to start the game",
    });
    broadcastRemoveRoom(io, code);
    delete roomIdToCode[room.roomId];
    delete rooms[code];
    console.log(`Room ${code} deleted, insufficient players before game start`);
    return false;
  }

  return true;
};

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
