import { buildPlayerList } from "../utils/playerList.js";
import { rooms, playersInRooms, roomIdToCode } from "../index.js";
import {
  broadcastRooms,
  broadcastAddRoom,
  broadcastRemoveRoom,
  broadcastUpdateRoom,
} from "../broadcast/broadcastRooms.js";

//CONFIG
const RECONNECT_TIMEOUT = 30000;

const setUpRoomSockets = (io, socket) => {
  // Room leave helper
  const leaveRoom = (code) => {
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

    if (!room.host || room.host.userId === socket.data.id) {
      // Kick everyone when host leaves and delete room
      io.to(code).emit("host-left", { message: "Host left the room" });
      // Notify public rooms that room deleted
      broadcastRemoveRoom(io, code);
      delete roomIdToCode[room.roomId];
      delete rooms[code];
      console.log(`Room ${code} deleted as host left`);

      // Remove all players from playersInRooms mapping
      room.players.forEach((player) => {
        delete playersInRooms[player.userId];
      });
    } else {
      // Delete room if empty
      if (room.players.length === 0) {
        // Notify public rooms that room deleted
        broadcastRemoveRoom(io, code);
        delete roomIdToCode[room.roomId];
        delete rooms[code];
        console.log(`Room ${code} deleted as it became empty`);
      } else {
        // Notify players in the room that someone left
        io.to(code).emit("player-left", { players: buildPlayerList(room) });
        broadcastUpdateRoom(io, room);
      }
    }
  };

  // Helper to build player info relevant to room/game
  const buildPlayerInfo = (socket) => {
    const player = {
      userId: socket.data.id,
      socketId: socket.id,
      username: socket.data.username,
      displayName: socket.data.displayName,
      isGuest: socket.data.isGuest,
      isReconnecting: false,
      disconnectTimeout: null,
    };
    return player;
  };

  // Helper to build minimal room info
  const buildRoomInfo = (room) => {
    return {
      code: room.code,
      roomName: room.roomName,
      host: room.host.username,
      players: buildPlayerList(room),
      maxPlayers: room.maxPlayers,
      isPublic: room.isPublic,
      difficulty: room.difficulty,
    };
  };

  // Listen for room creation
  socket.on(
    "create-room",
    ({ roomId, roomName, maxPlayers, isPublic, difficulty }, callback) => {
      // Get host username
      const username = socket.data.username;
      if (!username) {
        console.log("Username is required to create a room");
        return callback({ error: "Username is Required to Create a Room" });
      }

      // Check if player is already in a room
      if (playersInRooms[socket.data.id]) {
        console.log("Player is already in a room, cannot create another");
        return callback({
          error: "You are already in a room, cannot create one",
        });
      }

      // Check if room name is valid
      if (!roomName || roomName.trim() === "") {
        return callback({ error: "Room name is required" });
      }

      // Create a random code
      let code = Math.random().toString(36).substring(2, 6).toUpperCase();
      // Ensure code is unique
      while (rooms[code]) {
        code = Math.random().toString(36).substring(2, 6).toUpperCase();
      }

      // Verify difficulty is valid
      const validDifficulties = ["Easy", "Medium", "Hard"];
      if (!validDifficulties.includes(difficulty)) {
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
    },
  );

  // Handle cancel room creation
  socket.on("cancel-room-creation", ({ roomId }) => {
    // Find the room with the matching roomId
    const code = roomIdToCode[roomId];
    if (!code) {
      return;
    }
    console.log(`Room creation canceled for roomId ${roomId}, code ${code}`);
    leaveRoom(code);
  });

  const rejoinPlayer = (code, room, existingPlayer) => {
    // Handle reconnection
    // Clear timeout
    console.log(`Player ${existingPlayer.username} rejoined room ${code}`);
    clearTimeout(existingPlayer.disconnectTimeout);
    existingPlayer.disconnectTimeout = null;
    // Mark player as reconnected
    existingPlayer.isReconnecting = false;

    // Update socket id
    existingPlayer.socketId = socket.id;

    // If host updated, update host info
    if (room.host.userId === socket.data.id) {
      room.host = buildPlayerInfo(socket);
    }

    // Put player in the room
    socket.join(code);
    playersInRooms[socket.data.id] = code;

    return;
  };

  // Listen for on room join
  socket.on("join-room", ({ code }) => {
    // Get username from socket data
    const username = socket.data.username;
    if (!username) {
      socket.emit("room-join-error", {
        message: "Username is Required to Join a Room",
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
        leaveRoom(existingRoomCode);
        // Broadcast
        broadcastUpdateRoom(io, existingRoom);
      } else if (
        existingRoomCode === code &&
        playerInExistingRoom &&
        playerInExistingRoom.isReconnecting
      ) {
        // If they are trying to join the same room they are already in, just rejoin them
        rejoinPlayer(code, room, playerInExistingRoom);
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

    // Emit back to the player that joined
    socket.emit("room-joined", {
      roomInfo: buildRoomInfo(room),
    });
    // Emit to the rest of players inside that room
    socket.to(code).emit("player-joined", { players: buildPlayerList(room) });
    // Broadcast updated rooms list to all clients
    broadcastUpdateRoom(io, room);
    console.log(`Player ${username} joined room ${code}`);
  });

  // Rejoin room event
  socket.on("rejoin-room", ({ code }) => {
    // Get username from socket data
    const username = socket.data.username;
    if (!username) {
      socket.emit("room-rejoin-error");
      return;
    }
    const room = rooms[code];
    if (!room) {
      socket.emit("room-rejoin-error");
      return;
    }

    // Find player in room
    const existingPlayer = room.players.find(
      (p) => p.userId === socket.data.id,
    );
    if (!existingPlayer || !existingPlayer.isReconnecting) {
      socket.emit("room-rejoin-error");
      return;
    }

    // Handle rejoin
    rejoinPlayer(code, room, existingPlayer);
    // Emit back to the player that rejoined
    socket.emit("room-rejoined", {
      roomInfo: buildRoomInfo(room),
    });

    // Emit to the rest of players inside that room
    socket.to(code).emit("player-rejoined", {
      roomInfo: buildRoomInfo(room),
    });
  });

  // Leave room event
  socket.on("leave-room", ({ code }) => {
    leaveRoom(code);
  });

  // Listen for getting all rooms for public rooms page
  socket.on("get-rooms", () => {
    broadcastRooms(io, socket);
  });

  // Validity checks
  socket.on("check-room", ({ code }) => {
    // Check if room exists
    const room = rooms[code];
    if (!room) {
      socket.emit("check-room-response", {
        valid: false,
        message: "Room not found",
      });
      return;
    }

    // Check if player is inside the room
    const playerInRoom = room.players.some(
      (player) => player.socketId === socket.id,
    );
    if (!playerInRoom && !playerInRoom.isReconnecting) {
      socket.emit("check-room-response", {
        valid: false,
        message: "You are not a member of this room",
      });
      return;
    }

    // Valid now
    socket.emit("check-room-response", { valid: true });
  });

  // On public-rooms page
  socket.on("public-rooms", ({ onPage }) => {
    if (onPage) {
      socket.join("public-rooms");
      return;
    }
    socket.leave("public-rooms");
  });

  // Helper to handle the reconnect window for a player
  const handleReconnectWindow = () => {
    // Get room
    const code = playersInRooms[socket.data.id];
    if (!code) {
      return;
    }
    const room = rooms[code];
    if (!room) {
      return;
    }

    // Ignore if game started, let gameSockets handle it
    if (room.isGameStarted) {
      return;
    }

    // Find exact player in room
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) {
      return;
    }

    // Clear if previously reconnecting
    if (player.disconnectTimeout) {
      clearTimeout(player.disconnectTimeout);
      player.disconnectTimeout = null;
    }

    // Mark player as reconnecting
    player.isReconnecting = true;

    // Notify all players in the room that this player is reconnecting
    io.to(code).emit("player-reconnecting", {
      players: buildPlayerList(room),
    });

    // Set a timeout to remove the player if they don't reconnect in time
    player.disconnectTimeout = setTimeout(() => {
      leaveRoom(code);
    }, RECONNECT_TIMEOUT);
  };

  // Handle disconnection
  socket.on("disconnect", () => {
    handleReconnectWindow();
  });
};

export default setUpRoomSockets;
