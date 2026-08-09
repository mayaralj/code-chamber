// Imports
import db from "../db.js";
import { rooms } from "../globals.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";
import { playersInRooms, roomIdToCode } from "../globals.js";

// Function to update matches played for a player
export const updateMatchesPlayed = async (player) => {
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
export const isRoomStillValid = (io, socket, code) => {
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
