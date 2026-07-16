import { io } from "socket.io-client";

// Connect to the Socket.io server
const socket = io("http://localhost:5000", {
  withCredentials: true,
});

export default socket;
