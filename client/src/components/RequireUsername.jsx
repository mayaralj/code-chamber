import { Navigate, Outlet } from "react-router-dom";
import usePlayer from "../hooks/usePlayer";

const RequireUsername = () => {
  const { player, connectionStatus } = usePlayer();
  if (connectionStatus !== "connected") {
    return (
      <main className="fixed inset-0 z-50 grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        CONNECTING TO GAME SERVER...
      </main>
    );
  }
  const { username } = player;

  // Logged in, but no username, need a username to be able to play
  if (!username) {
    return <Navigate to="/choose-username" replace />;
  }

  // Logged in and has a username
  return <Outlet />;
};

export default RequireUsername;
