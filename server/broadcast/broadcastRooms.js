import { rooms } from "../globals.js";

// Batch Config
const BATCH_INTERVAL = 500;
const pendingBroadcasts = new Map();
let batchTimer = null;

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

// Queue broadcast for batch processing
const queueBroadcast = (code, type, data) => {
  // If no existing broadcast for this room, add to pending broadcasts
  const existing = pendingBroadcasts.get(code);
  if (!existing) {
    pendingBroadcasts.set(code, { type, data });
    return;
  }

  // Check if existed as both add and remove, if so, remove from pending broadcasts (happens if added then removed so it doenst need to be shown)
  if (existing.type === "add" && type === "remove") {
    pendingBroadcasts.delete(code);
    return;
  }

  // Set the latest type and data for this room
  pendingBroadcasts.set(code, { type, data });
};

// helper to flush
const flushBroadcasts = (io) => {
  // If no pending broadcasts, return
  if (pendingBroadcasts.size === 0) {
    return;
  }

  const added = [];
  const updated = [];
  const removed = [];

  // Iterate through pending broadcasts and emit to clients
  for (const [code, { type, data }] of pendingBroadcasts.entries()) {
    if (type === "add") {
      added.push(data);
    }
    if (type === "update") {
      updated.push(data);
    }
    if (type === "remove") {
      removed.push(data);
    }
  }

  //Clear pending broadcasts
  pendingBroadcasts.clear();

  // Emit to clients in public rooms page
  io.to("public-rooms").emit("rooms-batch-update", {
    added,
    updated,
    removed,
  });
};

// Start batch timer if not already started
export const startBatchTimer = (io) => {
  if (batchTimer) {
    return;
  }
  batchTimer = setInterval(() => {
    flushBroadcasts(io);
  }, BATCH_INTERVAL);
};

// Stop batch timer
export const stopBatchTimer = () => {
  clearInterval(batchTimer);
  batchTimer = null;
};

// BRoadcast rooms helper
export const broadcastRooms = (io, socket) => {
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
  socket.emit("rooms-list", publicRooms);
};

// Add room
export const broadcastAddRoom = (io, room) => {
  // If room is not public, don't broadcast
  if (!room.isPublic) {
    return;
  }
  queueBroadcast(room.code, "add", buildRoomInfoToSend(room));
};

// Remove room
export const broadcastRemoveRoom = (io, code) => {
  // If room is not public, don't broadcast
  if (!rooms[code] || !rooms[code].isPublic) {
    return;
  }
  queueBroadcast(code, "remove", code);
};

// Update room
export const broadcastUpdateRoom = (io, room) => {
  // If room is not public, don't broadcast
  if (!room.isPublic) {
    return;
  }
  queueBroadcast(room.code, "update", buildRoomInfoToSend(room));
};
