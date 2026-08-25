// Imports
import { rooms, playersInRooms } from "../globals.js";
import leaveRoom from "./leaveRoom.js";
import { buildRoomInfo, buildPlayerInfo } from "./roomUtils.js";
import { buildPlayerList } from "../utils/playerList.js";
import { broadcastUpdateRoom } from "../broadcast/broadcastRooms.js";
import reconnectRoom from "./reconnectRoom.js";
import leaveGame from "../game/leaveGame.js";
import { CODE_LENGTH } from "./createRoom.js";

// Join room method
const joinRoom = (io, socket, code) => {
  // Get username from socket data
  const username = socket.data.username;
  if (!username) {
    socket.emit("room-join-error", {
      message: "Username is Required to Join a Room",
    });
    return;
  }

  // Check code length
  if (code.length < CODE_LENGTH) {
    socket.emit("room-join-error", {
      message: `Room code must be ${CODE_LENGTH} characters long`,
    });
    return;
  }

  // Check if room exists
  const room = rooms[code];
  if (!room) {
    socket.emit("room-join-error", { message: "Room not found" });
    return;
  }

  // Check if player trying to join another room while reconnecting in a room (this will kick them out of current and join the new one, should rarely ever happen)
  const existingRoomCode = playersInRooms[socket.data.id];
  if (existingRoomCode) {
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

    if (
      existingRoomCode !== code &&
      playerInExistingRoom &&
      playerInExistingRoom.isReconnecting
    ) {
      console.log(
        `Player ${username} is trying to join room ${code} while reconnecting in room ${existingRoomCode}, kicking them from the old room`,
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
    } else if (
      existingRoomCode === code &&
      playerInExistingRoom &&
      playerInExistingRoom.isReconnecting
    ) {
      // If they are trying to join the same room they are already in, just rejoin them
      reconnectRoom(socket, code, playerInExistingRoom);
      socket.emit("room-joined", {
        roomInfo: buildRoomInfo(room),
      });
      return;
    }
  }

  // Check if player is already in a room
  if (playersInRooms[socket.data.id]) {
    socket.emit("room-join-error", {
      message: "You are already in a room, cannot join another",
    });
    return;
  }

  // Check if room is full
  if (room.players.length >= room.maxPlayers) {
    socket.emit("room-join-error", { message: "Room is full" });
    return;
  }

  // Check if game is starting
  if (room.isGameStarting) {
    socket.emit("room-join-error", { message: "Game is starting" });
    return;
  }

  // Check if game has already started
  if (room.isGameStarted) {
    socket.emit("room-join-error", { message: "Game has already started" });
    return;
  }

  // Push player to room
  room.players.push(buildPlayerInfo(socket));

  // Put player in the room
  socket.join(code);
  playersInRooms[socket.data.id] = code;

  // Update last activity timestamp
  room.lastActivity = Date.now();

  // Emit back to the player that joined
  socket.emit("room-joined", {
    roomInfo: buildRoomInfo(room),
  });
  // Emit to the rest of players inside that room
  socket.to(code).emit("player-joined", { players: buildPlayerList(room) });
  // Broadcast updated rooms list to all clients
  broadcastUpdateRoom(io, room);
  console.log(`Player ${username} joined room ${code}`);
};

export default joinRoom;
