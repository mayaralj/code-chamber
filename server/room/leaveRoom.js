// Imports
import { rooms, playersInRooms } from "../globals.js";
import { broadcastUpdateRoom } from "../broadcast/broadcastRooms.js";
import { buildPlayerList } from "../utils/playerList.js";
import deleteRoom from "./deleteRoom.js";

// Room leave helper
const leaveRoom = (io, socket, code) => {
  // Means just a regular disconnection
  if (!code) {
    return;
  }
  const room = rooms[code];
  if (!room) {
    return;
  }

  // If game started, let gameSockets handle it
  if (room.isGameStarted) {
    return;
  }

  // Remove player from room
  // Check they exist first
  const player = room.players.find((p) => p.userId === socket.data.id);
  if (!player) {
    console.log(
      `Socket ${socket.id} attempted to leave room: ${code} but player was not found`,
    );
    return;
  }
  room.players = room.players.filter(
    (player) => player.userId !== socket.data.id,
  );

  // Remove from room in socket.io and from playersInRooms mapping
  socket.leave(code);
  delete playersInRooms[socket.data.id];

  // Update last activity timestamp
  room.lastActivity = Date.now();

  if (!room.host || room.host.userId === socket.data.id) {
    // Kick everyone when host leaves and delete room
    deleteRoom(io, code, "Host left the room");
    console.log(`Host left room ${code}, deleting room`);
  } else {
    // Delete room if empty
    if (room.players.length === 0) {
      deleteRoom(io, code, "Room became empty");
      console.log(`Room ${code} deleted as it became empty`);
    } else {
      // Notify players in the room that someone left
      io.to(code).emit("player-left", { players: buildPlayerList(room) });
      broadcastUpdateRoom(io, room);
    }
  }
};

export default leaveRoom;
