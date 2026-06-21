import setUpRoomHandlers from "./roomSockets.js";
import setUpGameSockets from "./gameSockets.js";

const initSocket = (io, info) => {
  io.on("connection", (socket) => {
    console.log("A user connected: " + socket.id);

    // Room handlers
    setUpRoomHandlers(io, socket, {
      rooms: info.rooms,
      playersInRooms: info.playersInRooms,
    });

    // Game handlers
    setUpGameSockets(io, socket, {
      rooms: info.rooms,
      playersInRooms: info.playersInRooms,
      pendingCodeRequests: info.pendingCodeRequests,
      questions: info.questions,
    });
  });
};

export default initSocket;
