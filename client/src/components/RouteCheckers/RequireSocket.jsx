// Imports
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import usePlayer from "../../hooks/usePlayer";
import toast from "react-hot-toast";

// Array of connection statuses that indicate the player is disconnected from the server
const DISCONNECTED_STATUSES = [
  "connecting",
  "disconnected",
  "error",
  "lost-connection",
];

const RequireSocket = () => {
  const { connectionStatus } = usePlayer();
  const location = useLocation();

  const isDisconnected = DISCONNECTED_STATUSES.includes(connectionStatus);
  const isInGameOrRoom =
    location.pathname.startsWith("/game") ||
    location.pathname.startsWith("/room");

  // If socket disconnnects when in a game/room, kick the player out the server already guarantees cleanup for players stuck in this state (server disconnects them from game/room much quicker than the client can react to the disconnect)
  const shouldKickOut = isDisconnected && isInGameOrRoom;

  useEffect(() => {
    if (shouldKickOut) {
      toast.error("Connection not found/lost.");
    }
  }, [shouldKickOut]);

  if (shouldKickOut) {
    return <Navigate to="/browse" replace />;
  }

  if (isDisconnected) {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        CONNECTING TO GAME SERVER...
      </main>
    );
  }

  return <Outlet />;
};

export default RequireSocket;
