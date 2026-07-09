// Helper to delete room
const deleteRoom = (io, rooms, code) => {
  if (!rooms[code]) {
    return;
  }
  io.to(code).emit("room-deleted");
  io.in(code).socketsLeave(code);
  delete rooms[code];
  console.log(`Room ${code} deleted`);
};

export default deleteRoom;
