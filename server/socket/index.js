import setUpRoomHandlers from "./roomHandlers.js";

const initSocket = (io, info) => {
  io.on("connection", (socket) => {
    console.log("A user connected: " + socket.id);

    // Room handlers
    setUpRoomHandlers(io, socket, {
      rooms: info.rooms,
      playersInRooms: info.playersInRooms,
    });
  });
};

export default initSocket;
