import setUpRoomSockets from "./roomSockets.js";
import setUpGameSockets from "./gameSockets.js";
import auth from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { randomUUID } from "node:crypto";

// Track total socket connections
let totalConnections = 0;

// Initialize socket.io with all socket event handlers
const initSocket = (io, info) => {
  io.use(async (socket, next) => {
    try {
      const headers = fromNodeHeaders(socket.handshake.headers);
      const session = await auth.api.getSession({ headers });
      if (session?.user) {
        socket.data = {
          id: session.user.id,
          username: session.user.name,
          isGuest: false,
        };
      } else {
        // If no session, assign a guest user with a random ID
        socket.data = {
          id: `guest-${randomUUID()}`,
          username: `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
          isGuest: true,
        };
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    totalConnections++;
    console.log("A user connected: ", {
      id: socket.id,
      username: socket.data.username,
    });
    console.log("Total connections: " + totalConnections);

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

    socket.on("disconnect", () => {
      totalConnections--;
      console.log("A user disconnected: ", {
        id: socket.id,
        username: socket.data.username,
      });
      console.log("Total connections: " + totalConnections);
    });
  });
};

export default initSocket;
