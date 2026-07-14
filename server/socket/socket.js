import setUpRoomSockets from "./roomSockets.js";
import setUpGameSockets from "./gameSockets.js";

// Initialize socket.io with all socket event handlers
const initSocket = (io, info) => {
  io.on("connection", (socket) => {
    console.log("A user connected: " + socket.id);

    // Room handlers
    setUpRoomSockets(io, socket, {
      rooms: info.rooms,
      playersInRooms: info.playersInRooms,
    });

    // Game handlers
    setUpGameSockets(io, socket, {
      rooms: info.rooms,
      playersInRooms: info.playersInRooms,
    });
  });
};

export default initSocket;
