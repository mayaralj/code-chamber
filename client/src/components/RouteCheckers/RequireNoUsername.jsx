// RequireNoUsername.jsx
import { Navigate, Outlet } from "react-router";
import useStableSession from "../../hooks/useStableSession";
import toast from "react-hot-toast";

const RequireNoUsername = () => {
  const { session, isPending, error, persistentError } = useStableSession();

  if (isPending) {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        LOADING...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        {persistentError
          ? "SESSION ERROR — STILL TRYING..."
          : "SESSION ERROR — RETRYING..."}
      </main>
    );
  }

  if (session?.user && session.user?.username) {
    toast.error("You already have a username. Redirecting to your profile.");
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default RequireNoUsername;
