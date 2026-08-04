import { roomIdToCode } from "../index.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";

// Helper to delete room
const deleteRoom = (io, rooms, code) => {
  if (!rooms[code]) {
    return;
  }
  io.to(code).emit("room-deleted");
  io.in(code).socketsLeave(code);
  broadcastRemoveRoom(io, code);
  delete roomIdToCode[rooms[code].id];
  delete rooms[code];
  console.log(`Room ${code} deleted`);
};

export default deleteRoom;
