// RequireNoUsername.jsx
import { Navigate, Outlet } from "react-router-dom";
import useStableSession from "../hooks/useStableSession";

const RequireNoUsername = () => {
  const { session, isPending, error } = useStableSession();

  if (isPending) {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        LOADING...
      </main>
    );
  }

  if ((session?.user && session.user?.username) || error) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default RequireNoUsername;
