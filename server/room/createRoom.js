// Imports
import { rooms, roomIdToCode, playersInRooms } from "../globals.js";
import { buildRoomInfo, buildPlayerInfo } from "./roomUtils.js";
import {
  broadcastAddRoom,
  broadcastUpdateRoom,
} from "../broadcast/broadcastRooms.js";
import leaveRoom from "./leaveRoom.js";
import leaveGame from "../game/leaveGame.js";
import db from "../db.js";

// Config
const validDifficulties = ["easy", "medium", "hard"];

// Helper to cancel room creation
export const cancelRoomCreation = (io, socket, roomId) => {
  // Find the room with the matching roomId
  const code = roomIdToCode[roomId];
  if (!code) {
    return;
  }
  console.log(`Room creation canceled for roomId ${roomId}, code ${code}`);
  leaveRoom(io, socket, code);
};

// Helper to create a room
const createRoom = async (io, socket, roomData, callback) => {
  // Get host username
  const username = socket.data.username;
  if (!username) {
    console.log("Username is required to create a room");
    return callback({ error: "Username is Required to Create a Room" });
  }

  // Check if player trying create room while reconnecting in a room (this will kick them out of current and join the new one, should rarely ever happen)
  const existingRoomCode = playersInRooms[socket.data.id];
  const existingRoom = rooms[existingRoomCode];
  let playerInExistingRoom = null;
  if (!existingRoom) {
    // If the existing room doesn't exist, just remove them from playersInRooms and continue
    delete playersInRooms[socket.data.id];
  } else {
    playerInExistingRoom = existingRoom.players.find(
      (p) => p.userId === socket.data.id,
    );
  }

  // If the player is reconnecting in a room, kick them out of the old room
  if (playerInExistingRoom && playerInExistingRoom.isReconnecting) {
    console.log(
      `Player ${username} is trying to create new room while reconnecting in room ${existingRoomCode}, kicking them from the old room`,
    );
    clearTimeout(playerInExistingRoom.disconnectTimeout);
    playerInExistingRoom.disconnectTimeout = null;
    playerInExistingRoom.isReconnecting = false;

    // Check if game started to determine how to leave
    if (existingRoom.isGameStarted) {
      leaveGame(io, socket, existingRoomCode);
    } else {
      leaveRoom(io, socket, existingRoomCode);
    }
    // Broadcast
    broadcastUpdateRoom(io, existingRoom);
  }

  // Check if player is already in a room
  if (playersInRooms[socket.data.id]) {
    console.log("Player is already in a room, cannot create another");
    return callback({
      error: "You are already in a room, cannot create one",
    });
  }

  // Deconstruct room data
  const { roomId, roomName, maxPlayers, isPublic, difficulty } = roomData;
  // Check if all required fields are present
  if (
    !roomId ||
    !roomName ||
    !maxPlayers ||
    isPublic === undefined ||
    !difficulty
  ) {
    return callback({ error: "Missing required room data" });
  }

  // Verify room isnt somehow already in active rooms (should never happen but just in case)
  if (roomIdToCode[roomId]) {
    return callback({ error: "Room ID already exists in active rooms" });
  }

  // Verify room id to not already exist in db
  try {
    const { rows } = await db.query(
      "SELECT room_id FROM rooms WHERE room_id = $1",
      [roomId],
    );
    if (rows.length > 0) {
      return callback({ error: "Room ID already exists in database" });
    }
  } catch (error) {
    console.error("Error checking room ID:", error);
    return callback({ error: "Could not verify room ID. Please try again." });
  }

  // Check if room name is valid
  if (!roomName || roomName.trim() === "") {
    return callback({ error: "Room name is required" });
  }
  if (roomName.length > 20) {
    return callback({ error: "Room name is too long" });
  }

  // Create a random code
  let code = Math.random().toString(36).substring(2, 6).toUpperCase();
  // Ensure code is unique
  while (rooms[code]) {
    code = Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // Verify difficulty is valid
  if (!validDifficulties.includes(difficulty.toLowerCase())) {
    return callback({ error: "Invalid difficulty level" });
  }

  // Build player info for host
  const hostInfo = buildPlayerInfo(socket);

  // Store roomId to code mapping
  roomIdToCode[roomId] = code;

  // Store new room in active rooms
  rooms[code] = {
    roomId,
    host: hostInfo,
    code,
    players: [hostInfo],
    roomName,
    maxPlayers,
    roundStartTime: null,
    isPublic,
    difficulty,
    isGameStarted: false,
    isGameStarting: false,
  };

  // Put the creator in the room
  socket.join(code);
  playersInRooms[socket.data.id] = code;

  // Notify room added
  broadcastAddRoom(io, rooms[code]);

  // call back to the creator
  console.log(`Room ${code} created by ${username}`);
  callback({ roomInfo: buildRoomInfo(rooms[code]) });
};

export default createRoom;
