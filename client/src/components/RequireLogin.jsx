// RequireLogin.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import usePlayer from "../hooks/usePlayer";

const RequireLogin = () => {
  const location = useLocation();
  const { player, connectionStatus } = usePlayer();
  if (connectionStatus !== "connected") {
    return (
      <main className="fixed inset-0 z-50 grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        CONNECTING TO GAME SERVER...
      </main>
    );
  }
  const { isGuest } = player;

  if (isGuest) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequireLogin;
