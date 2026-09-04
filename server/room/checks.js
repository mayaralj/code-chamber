import { rooms } from "../globals.js";

// Helper to check if room exists and delete it if not
export const checkPlayer = (socket, code) => {
  // Check if room exists
  const room = rooms[code];
  if (!room) {
    socket.emit("check-player-response", {
      valid: false,
      message: "Room not found",
    });
    return;
  }

  // Check if player is inside the room
  const player = room.players.find((p) => p.userId === socket.data.id);
  if (!player) {
    socket.emit("check-player-response", {
      valid: false,
      message: "You are not a member of this room",
    });
    return;
  }

  // Valid now
  socket.emit("check-player-response", { valid: true });
};
