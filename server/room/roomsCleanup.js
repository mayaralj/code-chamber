// Imports
import db from "../db.js";
import {
  rooms,
  roomIdToCode,
  playersInRooms,
  currentRoomNames,
} from "../globals.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";

// Config
const CLEANUP_INTERVAL = 30 * 1000;
let cleanupTimer = null;
const INACTIVITY_THRESHOLD = 10 * 60 * 1000; // 10 minutes
const STALE_MATCH_THRESHOLD = "1 hour";

// Helper to delete inactive rooms and notify players
const deleteInactiveRooms = (io) => {
  let roomsToCleanup = [];
  // Iterate through all rooms and check for inactivity
  for (const [code, room] of Object.entries(rooms)) {
    const lastActivity = room.lastActivity || 0;
    const now = Date.now();
    if (now - lastActivity > INACTIVITY_THRESHOLD) {
      roomsToCleanup.push(code);
    }
  }

  // If there are rooms to cleanup, log them and remove them
  for (const code of roomsToCleanup) {
    const room = rooms[code];
    if (room) {
      // Notify players in the room that it is being deleted due to inactivity
      io.to(code).emit("room-deleted", {
        message: "Room deleted due to inactivity",
      });
      // Remove all players from playersInRooms mapping
      room.players.forEach((player) => {
        delete playersInRooms[player.userId];
      });
      // Remove room from roomIdToCode mapping
      delete roomIdToCode[room.roomId];
      // Remove room name from currentRoomNames set
      currentRoomNames.delete(room.roomName);

      broadcastRemoveRoom(io, code);
      console.log(`Room ${code} deleted due to inactivity`);

      // Remove room from database
      db.query(`DELETE FROM rooms WHERE room_id = $1`, [room.roomId])
        .then(() => {
          console.log(`Room ${code} removed from database`);
        })
        .catch((err) => {
          console.error(
            `Error removing room ${code} from database: ${err.message}`,
          );
        });

      // Finally, delete the room
      delete rooms[code];
    }
  }
};

// Helper to delete rooms from db whose matches were started but never resolved
const deleteStaleUnfinishedMatches = async () => {
  try {
    // Query but filter by past hour to avoid deleting recent matches that are still in progress
    const { rows } = await db.query(
      `DELETE FROM rooms
       WHERE room_id IN (
         SELECT DISTINCT room_id
         FROM matches
         WHERE won IS NULL
           AND played_at < NOW() - INTERVAL '${STALE_MATCH_THRESHOLD}'
       )
       RETURNING room_id`,
    );

    // Log the deleted rooms
    if (rows.length > 0) {
      console.log(
        `Removed ${rows.length} stale unfinished match room(s): ${rows
          .map((r) => r.room_id)
          .join(", ")}`,
      );
    }
  } catch (err) {
    // Log the error but don't throw, as we want the cleanup to continue
    console.error("Error cleaning up stale unfinished matches:", err.message);
  }
};

// Helper to cleanup rooms that have been inactive for a certain amount of time
const roomsCleanup = async (io) => {
  deleteInactiveRooms(io);
  await deleteStaleUnfinishedMatches();
};

// Helper to start the leaderboard compute interval (index starts this on server start)
export const startRoomsCleanup = (io) => {
  // Check if already running
  if (cleanupTimer) return;

  console.log("Starting scheduled rooms cleanup...");

  // Warm the cache immediately so the first request isn't empty
  roomsCleanup(io);

  // Start running on an interval
  cleanupTimer = setInterval(async () => {
    try {
      await roomsCleanup(io);
    } catch (err) {
      console.error("Rooms cleanup failed:", err);
      // dont update liveStats if there's an error, keep the last good data
    }
  }, CLEANUP_INTERVAL);
};

// Helper to stop the leaderboard compute interval
export const stopRoomsCleanup = () => {
  clearInterval(cleanupTimer);
  cleanupTimer = null;
};
