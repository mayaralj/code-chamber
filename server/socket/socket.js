import setUpRoomHandlers from "./roomSockets.js";
import setUpQuestionSockets from "./questionSockets.js";

const initSocket = (io, info) => {
  io.on("connection", (socket) => {
    console.log("A user connected: " + socket.id);

    // Room handlers
    setUpRoomHandlers(io, socket, {
      rooms: info.rooms,
      playersInRooms: info.playersInRooms,
    });

    // Question handlers
    setUpQuestionSockets(io, socket, {
      rooms: info.rooms,
      questions: info.questions,
    });
  });
};

export default initSocket;
