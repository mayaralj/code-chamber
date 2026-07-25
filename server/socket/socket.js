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
    // Authenticate user session and attach user data to socket
    try {
      const headers = fromNodeHeaders(socket.handshake.headers);
      const session = await auth.api.getSession({ headers });
      if (session?.user) {
        socket.data = {
          id: session.user.id,
          username: session.user.username ?? session.user.name,
          displayName:
            session.user.displayUsername ??
            session.user.username ??
            session.user.name,
          isGuest: false,
        };
      } else {
        const guestUsername = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
        // If no session, assign a guest user with a random ID
        socket.data = {
          id: `guest-${randomUUID()}`,
          username: guestUsername.toLowerCase(),
          displayName: guestUsername,
          isGuest: true,
        };
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    // Send to client right away
    socket.emit("user-data", {
      id: socket.data.id,
      username: socket.data.username,
      displayName: socket.data.displayName,
      isGuest: socket.data.isGuest,
    });

    totalConnections++;
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

    // Handle disconnection
    socket.on("disconnect", () => {
      totalConnections--;
      console.log("Total connections: " + totalConnections);
    });
  });
};

export default initSocket;
