import setUpRoomSockets from "./roomSockets.js";
import setUpGameSockets from "./gameSockets.js";
import auth from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { randomUUID } from "node:crypto";

// Track total socket connections
let totalConnections = 0;

// Guest username config
let guestIdToUsername = new Map();
let usernameToGuestId = new Map();
let deleteGuestUsernameTimeouts = new Map();
const GUEST_USERNAME_REMOVE_TIMEOUT = 60000;
const SUFFIX_LENGTH = 4;

// helper to generate guest suffix
const generateGuestSuffix = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

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
          username: session.user.username,
          displayName: session.user.displayUsername ?? session.user.name,
          isGuest: false,
        };
      } else {
        // Reuse guest id from client if it exists
        const providedGuestId = socket.handshake.auth?.guestId;
        const guestId = providedGuestId?.startsWith("guest-")
          ? providedGuestId
          : `guest-${randomUUID()}`;
        // Cancel any username cleanup timeout if it exists
        if (deleteGuestUsernameTimeouts.has(guestId)) {
          clearTimeout(deleteGuestUsernameTimeouts.get(guestId));
          deleteGuestUsernameTimeouts.delete(guestId);
        }

        // Check if guest username already exists
        let guestUsername = guestIdToUsername.get(guestId);

        // Check if someone else has this name with a different id
        if (
          guestUsername &&
          usernameToGuestId.get(guestUsername.toLowerCase()) !== guestId
        ) {
          guestUsername = null;
        }
        // Generate new
        if (!guestUsername) {
          guestUsername = `Guest-${generateGuestSuffix()}`;
          while (usernameToGuestId.has(guestUsername.toLowerCase())) {
            guestUsername = `Guest-${generateGuestSuffix()}`;
          }
        } else {
          // Make the first letter uppercase for display name
          guestUsername =
            guestUsername.charAt(0).toUpperCase() + guestUsername.slice(1);
        }

        // Add to set
        guestIdToUsername.set(guestId, guestUsername.toLowerCase());
        usernameToGuestId.set(guestUsername.toLowerCase(), guestId);

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
        const deleteGuestUsernameTimeout = setTimeout(() => {
          guestIdToUsername.delete(socket.data.id);
          usernameToGuestId.delete(socket.data.username.toLowerCase());
          deleteGuestUsernameTimeouts.delete(socket.data.id);
        }, GUEST_USERNAME_REMOVE_TIMEOUT);
        deleteGuestUsernameTimeouts.set(
          socket.data.id,
          deleteGuestUsernameTimeout,
        );
      }

      // Decrement total connections
      totalConnections--;
    });
  });
};

export default initSocket;
