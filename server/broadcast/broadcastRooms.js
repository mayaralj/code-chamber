import { rooms } from "../index.js";

// Helper to build room info that is sent to clients for public rooms page (as minimal as possible)
const buildRoomInfoToSend = (room) => {
  return {
    code: room.code,
    roomName: room.roomName,
    host: room.host.username,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    difficulty: room.difficulty,
    isGameStarting: room.isGameStarting,
    isGameStarted: room.isGameStarted,
  };
};

// BRoadcast rooms helper
export const broadcastRooms = (io) => {
  let publicRooms = Object.values(rooms).filter((room) => room.isPublic);
  // Fill up public rooms for testing 30 rooms
  // while (publicRooms.length < 30) {
  //   const randomDifficulty = ["Easy", "Medium", "Hard"][
  //     Math.floor(Math.random() * 3)
  //   ];
  //   const randomMaxPlayers = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)];
  //   const randomGameStarted = [true, false][Math.floor(Math.random() * 2)];
  //   publicRooms.push({
  //     code: `TEST${publicRooms.length + 1}`,
  //     roomName: `Test Room ${publicRooms.length + 1}`,
  //     host: { username: "TestHost" },
  //     players: [],
  //     maxPlayers: randomMaxPlayers,
  //     isPublic: true,
  //     difficulty: randomDifficulty,
  //     isGameStarted: randomGameStarted,
  //   });
  // }

  // Build rooms object with only necessary info for public rooms page
  publicRooms = publicRooms.map((room) => buildRoomInfoToSend(room));

  // Broadcast only to clients in public rooms page
  io.to("public-rooms").emit("rooms-list", publicRooms);
};

// Add room
export const broadcastAddRoom = (io, room) => {
  // If room is not public, don't broadcast
  if (!room.isPublic) {
    return;
  }
  io.to("public-rooms").emit("room-added", {
    room: buildRoomInfoToSend(room),
  });
};

// Remove room
export const broadcastRemoveRoom = (io, code) => {
  // If room is not public, don't broadcast
  if (!rooms[code] || !rooms[code].isPublic) {
    return;
  }
  io.to("public-rooms").emit("room-deleted", { code });
};

// Update room
export const broadcastUpdateRoom = (io, room) => {
  // If room is not public, don't broadcast
  if (!room.isPublic) {
    return;
  }
  io.to("public-rooms").emit("room-updated", {
    updatedRoom: buildRoomInfoToSend(room),
  });
};
