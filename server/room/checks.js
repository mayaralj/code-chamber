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
  const playerInRoom = room.players.some(
    (player) => player.userId === socket.data.id,
  );
  if (!playerInRoom && !playerInRoom.isReconnecting) {
    socket.emit("check-player-response", {
      valid: false,
      message: "You are not a member of this room",
    });
    return;
  }

  // Valid now
  socket.emit("check-player-response", { valid: true });
};
