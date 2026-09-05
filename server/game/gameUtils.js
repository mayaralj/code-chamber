// Imports
import db from "../db.js";
import { rooms } from "../globals.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";
import { playersInRooms, roomIdToCode, currentRoomNames } from "../globals.js";

// Function to update matches played for a player
export const trackBeforeMatch = async (player, room) => {
  // Validate
  if (!player || !player.userId || player.isGuest) return;
  if (!room || !room.roomId) return;

  // destructure roomId and difficulty from the room object
  const { roomId, difficulty } = room;

  // Insert match into the database (not full match data, just the fact that the player played a match in this room)
  try {
    await db.query(
      `INSERT INTO matches (room_id, user_id, host_id, difficulty, played_at)
     VALUES ($1, $2, $3, $4, NOW())`,
      [roomId, player.userId, room.host.userId, difficulty],
    );
  } catch (error) {
    console.error(
      `Error tracking before match for player ${player.userId} in room ${roomId}:`,
      error,
    );
  }
};

// Helper to check if room is still valid before game officially starts (mainly checks for players that dc while waiting for game to start)
export const isRoomStillValid = (io, socket, code) => {
  // If room doesn't exist, return false
  const room = rooms[code];
  if (!room) return false;

  // If room has not enough players, cancel game start and delete room
  if (room.players.length < 2) {
    for (const player of room.players) {
      delete playersInRooms[player.userId];
    }
    io.to(code).emit("game-start-cancelled", {
      message: "Not enough players to start the game",
    });
    broadcastRemoveRoom(io, code);
    delete roomIdToCode[room.roomId];
    currentRoomNames.delete(room.roomName);
    delete rooms[code];
    console.log(`Room ${code} deleted, insufficient players before game start`);
    return false;
  }

  return true;
};
