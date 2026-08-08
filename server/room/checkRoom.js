import { rooms } from "../globals.js";

// Helper to check if room exists and delete it if not
const checkRoom = (code) => {
  if (rooms[code]) {
    return true;
  }

  return false;
};

export default checkRoom;
