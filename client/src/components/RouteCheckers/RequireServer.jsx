import { Outlet } from "react-router";
import useServerHealth from "../../hooks/useServerHealth";

const RequireServer = () => {
  const { serverUnreachable } = useServerHealth();

  if (serverUnreachable) {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        SERVER TEMPORARILY DOWN — RETRYING...
      </main>
    );
  }

  return <Outlet />;
};

export default RequireServer;
