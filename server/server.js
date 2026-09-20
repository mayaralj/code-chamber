// Imports
import http from "http";
import { Server } from "socket.io";

// Create server and socket.io instance
export const createServer = (app) => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
    // adjust ping interval and timeout to 2 and 3 seconds for faster detection of disconnects
    pingInterval: 2000,
    pingTimeout: 3000,
  });
  return { server, io };
};
