import setUpRoomSockets from "./roomSockets.js";
import setUpGameSockets from "./gameSockets.js";
import auth from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import {
  getGuestId,
  cancelGuestUsernameTimeout,
  getGuestUsername,
  scheduleGuestUsernameDeletion,
} from "../utils/guest.js";

// Track total socket connections
export let totalConnections = 0;

// Initialize socket.io with all socket event handlers
const initSocket = (io) => {
  io.use(async (socket, next) => {
    // Authenticate user session and attach user data to socket
    try {
      const headers = fromNodeHeaders(socket.handshake.headers);
      const session = await auth.api.getSession({ headers });
      if (session?.user) {
        socket.data = {
          id: session.user.id,
          username: session.user.username,
          displayName: session.user.displayUsername ?? session.user.name,
          isGuest: false,
        };
      } else {
        const guestId = getGuestId(socket);
        cancelGuestUsernameTimeout(guestId);
        const guestUsername = getGuestUsername(guestId);
        socket.data = {
          id: guestId,
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

    // Room handlers
    setUpRoomSockets(io, socket);

    // Game handlers
    setUpGameSockets(io, socket);

    // Handle disconnection
    socket.on("disconnect", () => {
      // Remove guest username from set if guest after one minute of disconnection (to allow for quick reconnections)
      if (socket.data.isGuest) {
        scheduleGuestUsernameDeletion(socket.data.id);
      }

      // Decrement total connections
      totalConnections--;
    });
  });
};

export default initSocket;
