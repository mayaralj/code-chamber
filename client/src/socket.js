import { io } from "socket.io-client";

// Get stored guest ID from localStorage if it exists
const storedGuestId = localStorage.getItem("guestId");

// Connect to the Socket.io server
export const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  auth: {
    guestId: storedGuestId || null,
  },
});

// Function to refresh the socket connection
export const refreshSocketConnection = () => {
  return new Promise((resolve, reject) => {
    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const handleError = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
    };

    socket.once("connect", handleConnect);
    socket.once("connect_error", handleError);

    socket.disconnect();
    socket.connect();
  });
};
