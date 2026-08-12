import { Outlet, Navigate } from "react-router";
import useServerHealth from "../../hooks/useServerHealth";

const RequireServer = () => {
  const { serverUnreachable } = useServerHealth();

  if (serverUnreachable) {
    // If in one of the game/room screens exit out first (if server unreacheable we can just kick them out)
    const pathName = window.location.pathname;
    if (pathName.startsWith("/game") || pathName.startsWith("/room")) {
      return <Navigate to="/browse" replace />;
    }
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        CONNECTING TO SERVER...
      </main>
    );
  }

  return <Outlet />;
};

export default RequireServer;
