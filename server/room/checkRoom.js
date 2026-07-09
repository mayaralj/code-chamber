import deleteRoom from "./deleteRoom.js";

// Helper to check if room exists and delete it if not
const checkRoom = (io, rooms, code) => {
  if (rooms[code]) {
    return true;
  }

  deleteRoom(io, rooms, code);
  return false;
};

export default checkRoom;
