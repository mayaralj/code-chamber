import { roomIdToCode, playersInRooms, currentRoomNames } from "../globals.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";
import { rooms } from "../globals.js";

// Helper to delete room
const deleteRoom = (io, code, message) => {
  if (!rooms[code]) {
    return;
  }
  io.to(code).emit("room-deleted", { message: message || "Room deleted" });
  io.in(code).socketsLeave(code);
  rooms[code].players.forEach((player) => {
    delete playersInRooms[player.userId];
  });
  broadcastRemoveRoom(io, code);
  delete roomIdToCode[rooms[code].roomId];
  currentRoomNames.delete(rooms[code].roomName);
  delete rooms[code];
  console.log(`Room ${code} deleted`);
};

export default deleteRoom;
