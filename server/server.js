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
    pingInterval: 5000, // 10 seconds
    pingTimeout: 5000, // 5 seconds
  });
  return { server, io };
};
