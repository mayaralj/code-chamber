import { Outlet } from "react-router-dom";
import usePlayer from "../hooks/usePlayer";

const RequireSocket = () => {
  const { connectionStatus } = usePlayer();

  if (connectionStatus === "connected") {
    return <Outlet />;
  }

  return (
    <main className="fixed inset-0 z-50 grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
      CONNECTING TO GAME SERVER...
    </main>
  );
};

export default RequireSocket;
