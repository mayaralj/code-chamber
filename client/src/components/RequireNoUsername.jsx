// RequireNoUsername.jsx
import { Navigate, Outlet } from "react-router-dom";
import useStableSession from "../hooks/useStableSession";

const RequireNoUsername = () => {
  const { data: session, isPending, error } = useStableSession();

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] font-mono text-sm tracking-[0.16em] text-[#d9bd8f]">
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
