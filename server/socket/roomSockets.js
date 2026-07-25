import { buildPlayerList } from "../utils/playerList.js";

const setUpRoomSockets = (io, socket, { rooms, playersInRooms }) => {
  // BRoadcast rooms helper
  const broadcastRooms = () => {
    let publicRooms = Object.values(rooms).filter(
      (room) => room.isPublic && !room.isGameStarted,
    );
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
    publicRooms = publicRooms.map((room) => ({
      code: room.code,
      roomName: room.roomName,
      host: room.host.username,
      players: buildPlayerList(room),
      maxPlayers: room.maxPlayers,
      isPublic: room.isPublic,
      difficulty: room.difficulty,
      isGameStarted: room.isGameStarted,
    }));

    // Broadcast only to clients in public rooms page
    io.to("public-rooms").emit("rooms-list", publicRooms);
  };

  // Room leave helper
  const leaveRoom = (socket, code) => {
    const room = rooms[code];
    if (!room) {
      return;
    }

    // If game started, let gameSockets handle it
    if (room.isGameStarted) {
      return;
    }

    // Remove player from room
    room.players = room.players.filter(
      (player) => player.socketId !== socket.id,
    );

    // Remove from room in socket.io and from playersInRooms mapping
    socket.leave(code);
    delete playersInRooms[socket.id];

    if (!room.host || room.host.socketId === socket.id) {
      // Kick everyone when host leaves and delete room
      io.to(code).emit("host-left", { message: "Host left the room" });
      delete rooms[code];
      console.log(`Room ${code} deleted as host left`);
    } else {
      // Delete room if empty
      if (room.players.length === 0) {
        delete rooms[code];
        console.log(`Room ${code} deleted as it became empty`);
      } else {
        // Notify players in the room that someone left
        io.to(code).emit("player-left", { players: buildPlayerList(room) });
      }
    }

    // Broadcast updated rooms list to all clients
    broadcastRooms();
  };

  // Helper to build player info relevant to room/game
  const buildPlayerInfo = (socket) => {
    const player = {
      userId: socket.data.id,
      socketId: socket.id,
      username: socket.data.username,
      displayName: socket.data.displayName,
      isGuest: socket.data.isGuest,
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
  socket.on("create-room", ({ roomName, maxPlayers, isPublic, difficulty }) => {
    // Get host username
    const username = socket.data.username;
    if (!username) {
      console.log("Username is required to create a room");
      socket.emit("room-create-error", {
        message: "Username is Required to Create a Room",
      });
      return;
    }

    // Check if room name is valid
    if (!roomName || roomName.trim() === "") {
      socket.emit("room-create-error", { message: "Room name is required" });
      return;
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
      socket.emit("room-create-error", {
        message: "Invalid difficulty level",
      });
      return;
    }

    const hostInfo = buildPlayerInfo(socket);

    // Store new room in active rooms
    rooms[code] = {
      host: hostInfo,
      code,
      players: [hostInfo],
      roomName,
      maxPlayers,
      roundStartTime: null,
      isPublic,
      difficulty,
      isGameStarted: false,
    };

    // Put the creator in the room
    socket.join(code);
    playersInRooms[socket.id] = code;

    // Emit back to the creator
    socket.emit("room-created", {
      roomInfo: buildRoomInfo(rooms[code]),
    });
    broadcastRooms();
    console.log(`Room ${code} created by ${username}`);
  });

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

    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      socket.emit("room-join-error", { message: "Room is full" });
      return;
    }

    // Push player to room
    room.players.push(buildPlayerInfo(socket));

    // Put player in the room
    socket.join(code);
    playersInRooms[socket.id] = code;

    // Emit back to the player that joined
    socket.emit("room-joined", {
      roomInfo: buildRoomInfo(room),
    });
    // Emit to the rest of players inside that room
    socket.to(code).emit("player-joined", { players: buildPlayerList(room) });
    // Broadcast updated rooms list to all clients
    broadcastRooms();
    console.log(`Player ${username} joined room ${code}`);
  });

  // Leave room event
  socket.on("leave-room", ({ code }) => {
    leaveRoom(socket, code);
  });

  // Listen for getting all rooms for public rooms page
  socket.on("get-rooms", () => {
    broadcastRooms();
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
    if (!playerInRoom) {
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

  // Handle disconnection
  socket.on("disconnect", () => {
    leaveRoom(socket, playersInRooms[socket.id]);
  });
};

export default setUpRoomSockets;
