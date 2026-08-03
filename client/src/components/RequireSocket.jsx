import { Navigate, Outlet } from "react-router";
import usePlayer from "../hooks/usePlayer";

const RequireSocket = () => {
  const { connectionStatus } = usePlayer();

  if (
    connectionStatus === "connecting" ||
    connectionStatus === "disconnected" ||
    connectionStatus === "error" ||
    connectionStatus === "lost-connection"
  ) {
    // If in one of the game/room screens exit out first
    const pathName = window.location.pathname;
    if (pathName.startsWith("/game") || pathName.startsWith("/room")) {
      return <Navigate to="/browse" replace />;
    }
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        CONNECTING TO GAME SERVER...
      </main>
    );
  }

  return <Outlet />; // "connected" or "reconnecting" both render Outlet
};

export default RequireSocket;
