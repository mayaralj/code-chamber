import { rooms } from "../index.js";

// Helper to check if room exists and delete it if not
const checkRoom = (io, code) => {
  if (rooms[code]) {
    return true;
  }

  return false;
};

export default checkRoom;
