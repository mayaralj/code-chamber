import { io } from "socket.io-client";

// Connect to the Socket.io server
export const socket = io("http://localhost:5000", {
  withCredentials: true,
});

export const refreshSocketConnection = () => {
  socket.disconnect();
  socket.connect();
};
