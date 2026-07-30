// RequireNoUsername.jsx
import { Navigate, Outlet } from "react-router-dom";
import usePlayer from "../hooks/usePlayer";

const RequireNoUsername = () => {
  const { player, connectionStatus } = usePlayer();
  if (connectionStatus !== "connected") {
    return (
      <main className="fixed inset-0 z-50 grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        CONNECTING TO GAME SERVER...
      </main>
    );
  }
  const { username } = player;

  if (username) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default RequireNoUsername;
