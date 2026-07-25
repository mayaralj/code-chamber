import { io } from "socket.io-client";

// Connect to the Socket.io server
export const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: false,
});

export const refreshSocketConnection = () => {
  new Promise((resolve, reject) => {
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
