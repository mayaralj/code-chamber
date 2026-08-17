import { roomIdToCode, playersInRooms, currentRoomNames } from "../globals.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";

// Helper to delete room
const deleteRoom = (io, rooms, code) => {
  if (!rooms[code]) {
    return;
  }
  io.to(code).emit("room-deleted");
  io.in(code).socketsLeave(code);
  rooms[code].players.forEach((player) => {
    delete playersInRooms[player.userId];
  });
  broadcastRemoveRoom(io, code);
  delete roomIdToCode[rooms[code].id];
  currentRoomNames.delete(rooms[code].roomName);
  delete rooms[code];
  console.log(`Room ${code} deleted`);
};

export default deleteRoom;
