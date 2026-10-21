// Imports
import db from "../db.js";
import {
  rooms,
  roomIdToCode,
  playersInRooms,
  currentRoomNames,
} from "../globals.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";
import { queueLeaderboard } from "../leaderboard/precomputeLeaderboard.js";
import { queueLiveStats } from "../liveStats/precomputeLiveStats.js";

// Config
const CLEANUP_INTERVAL = 30 * 1000;
const STALE_MATCH_CLEANUP_INTERVAL = 6 * 60 * 60 * 1000;
let cleanupTimer = null;
let staleMatchCleanupTimer = null;
const INACTIVITY_THRESHOLD = 10 * 60 * 1000; // 10 minutes
const STALE_MATCH_THRESHOLD = "2 hours"; // only crashed/abandoned games should ever hit this

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

      // Only rooms that actually started a game were ever inserted into the db
      if (room.isGameStarted) {
        db.query(`DELETE FROM rooms WHERE room_id = $1`, [room.roomId])
          .then(({ rowCount }) => {
            console.log(`Room ${code} removed from database`);
            if (rowCount > 0) {
              queueLeaderboard();
              queueLiveStats();
            }
          })
          .catch((err) => {
            console.error(
              `Error removing room ${code} from database: ${err.message}`,
            );
          });
      }

      // Finally, delete the room
      delete rooms[code];
    }
  }
};

// Helper to delete rooms from db whose games never resolved for any player OR games with no matches played (e.g. server crashed before tracking any matches)
const deleteStaleUnfinishedMatches = async () => {
  try {
    const { rows } = await db.query(
      `DELETE FROM rooms r
       WHERE r.created_at < NOW() - INTERVAL '${STALE_MATCH_THRESHOLD}'
         AND r.is_completed = FALSE
       RETURNING r.room_id`,
    );

    if (rows.length > 0) {
      queueLeaderboard();
      queueLiveStats();
      console.log(
        `Removed ${rows.length} stale unfinished match room(s): ${rows
          .map((r) => r.room_id)
          .join(", ")}`,
      );
    }
  } catch (err) {
    console.error("Error cleaning up stale unfinished matches:", err.message);
  }
};

// Helper to cleanup rooms that have been inactive for a certain amount of time
const roomsCleanup = (io) => {
  deleteInactiveRooms(io);
};

// Helper to start the leaderboard compute interval (index starts this on server start)
export const startRoomsCleanup = (io) => {
  // Check if already running
  if (cleanupTimer) return;

  console.log("Starting scheduled rooms cleanup...");

  // Check in-memory room inactivity immediately.
  roomsCleanup(io);

  // Stale database rows only need an occasional sweep. This query wakes the
  // Neon compute, so keep it separate from the frequent in-memory cleanup.
  void deleteStaleUnfinishedMatches();

  // Check in-memory room inactivity frequently without polling the database.
  cleanupTimer = setInterval(() => {
    try {
      roomsCleanup(io);
    } catch (err) {
      console.error("Rooms cleanup failed:", err);
    }
  }, CLEANUP_INTERVAL);

  // Sweep abandoned database rows every six hours instead of every 30 seconds.
  staleMatchCleanupTimer = setInterval(() => {
    void deleteStaleUnfinishedMatches();
  }, STALE_MATCH_CLEANUP_INTERVAL);
};

// Helper to stop the leaderboard compute interval
export const stopRoomsCleanup = () => {
  clearInterval(cleanupTimer);
  cleanupTimer = null;
  clearInterval(staleMatchCleanupTimer);
  staleMatchCleanupTimer = null;
};
