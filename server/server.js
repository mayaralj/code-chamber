// Imports
import http from "http";
import { Server } from "socket.io";

// Create server and socket.io instance
export const createServer = (app) => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
    // adjust ping interval and timeout to 5 seconds for faster detection of disconnects
    pingInterval: 5000,
    pingTimeout: 5000,
  });
  return { server, io };
};
